import { describe, expect, it } from "vitest";
import {
  fromJst,
  isLastDayOfJstMonth,
  scheduleHorizon,
  startOfJstMonth,
  toJstParts,
  weeklyOccurrences,
} from "./jst";

// 用日本时间写的时刻（例如 "2026-11-30T23:00"），转为 Date
function jst(local: string): Date {
  return new Date(`${local}:00+09:00`);
}

describe("toJstParts / fromJst", () => {
  it("UTC 15:00 是日本时间次日 0:00", () => {
    expect(toJstParts(new Date("2026-11-01T15:00:00Z"))).toEqual({
      year: 2026,
      month: 11,
      day: 2,
      hour: 0,
      minute: 0,
      weekday: 1, // 2026-11-02 是周一
    });
  });

  it("周日对应 7", () => {
    expect(toJstParts(jst("2026-11-08T10:00")).weekday).toBe(7);
  });

  it("fromJst 与 toJstParts 互为逆运算", () => {
    expect(fromJst(2026, 11, 5, 13)).toEqual(jst("2026-11-05T13:00"));
  });

  it("月份超出范围时自动进位到次年", () => {
    expect(fromJst(2026, 13, 1)).toEqual(jst("2027-01-01T00:00"));
  });
});

describe("startOfJstMonth", () => {
  it("本月 1 日、下个月 1 日", () => {
    const now = jst("2026-11-15T12:00");
    expect(startOfJstMonth(now)).toEqual(jst("2026-11-01T00:00"));
    expect(startOfJstMonth(now, 1)).toEqual(jst("2026-12-01T00:00"));
  });

  it("按日本时间判断月份（UTC 还是上个月时，日本已是下个月）", () => {
    // UTC 10/31 20:00 = 日本时间 11/1 5:00
    expect(startOfJstMonth(new Date("2026-10-31T20:00:00Z"))).toEqual(jst("2026-11-01T00:00"));
  });

  it("跨年", () => {
    expect(startOfJstMonth(jst("2026-12-31T23:59"), 1)).toEqual(jst("2027-01-01T00:00"));
  });
});

describe("isLastDayOfJstMonth", () => {
  it.each([
    ["2026-11-30T00:00", true],
    ["2026-11-30T23:59", true],
    ["2026-11-29T23:59", false],
    ["2026-12-01T00:00", false],
    ["2026-12-31T12:00", true],
    // 闰年与平年的 2 月
    ["2028-02-28T12:00", false],
    ["2028-02-29T12:00", true],
    ["2027-02-28T12:00", true],
  ])("%s → %s", (local, expected) => {
    expect(isLastDayOfJstMonth(jst(local))).toBe(expected);
  });
});

describe("scheduleHorizon", () => {
  it("平时排到本月底", () => {
    expect(scheduleHorizon(jst("2026-11-29T23:59"))).toEqual(jst("2026-12-01T00:00"));
  });

  it("每月最后一天排到下个月底", () => {
    expect(scheduleHorizon(jst("2026-11-30T00:00"))).toEqual(jst("2027-01-01T00:00"));
  });

  it("月初恢复为排到本月底", () => {
    expect(scheduleHorizon(jst("2026-12-01T00:00"))).toEqual(jst("2027-01-01T00:00"));
    expect(scheduleHorizon(jst("2026-12-02T00:00"))).toEqual(jst("2027-01-01T00:00"));
  });
});

describe("weeklyOccurrences", () => {
  const monday13 = { weekday: 1, startHour: 13 };
  const thursday13 = { weekday: 4, startHour: 13 };

  it("列出范围内每周对应的开始时间，按时间升序", () => {
    const result = weeklyOccurrences(
      [thursday13, monday13],
      jst("2026-11-01T00:00"),
      jst("2026-12-01T00:00"),
    );
    expect(result.map((r) => r.startsAt)).toEqual([
      jst("2026-11-02T13:00"),
      jst("2026-11-05T13:00"),
      jst("2026-11-09T13:00"),
      jst("2026-11-12T13:00"),
      jst("2026-11-16T13:00"),
      jst("2026-11-19T13:00"),
      jst("2026-11-23T13:00"),
      jst("2026-11-26T13:00"),
      jst("2026-11-30T13:00"),
    ]);
    expect(result[0]?.rule).toBe(monday13);
  });

  it("不包含 from 当时及之前的时间（已经开始的课不再排）", () => {
    const result = weeklyOccurrences([monday13], jst("2026-11-02T13:00"), jst("2026-11-10T00:00"));
    expect(result.map((r) => r.startsAt)).toEqual([jst("2026-11-09T13:00")]);
  });

  it("不包含 to 当时及之后的时间", () => {
    const result = weeklyOccurrences([monday13], jst("2026-11-01T00:00"), jst("2026-11-09T13:00"));
    expect(result.map((r) => r.startsAt)).toEqual([jst("2026-11-02T13:00")]);
  });

  it("没有规则时返回空数组", () => {
    expect(weeklyOccurrences([], jst("2026-11-01T00:00"), jst("2026-12-01T00:00"))).toEqual([]);
  });
});
