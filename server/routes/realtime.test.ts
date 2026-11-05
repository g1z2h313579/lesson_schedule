import { env } from "cloudflare:test";
import { MOCK_USER_ID_QUERY } from "@shared/constants/headers";
import { REALTIME_PING, REALTIME_PONG, REALTIME_PROTOCOL } from "@shared/constants/realtime";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../app";
import {
  addApprovedCredits,
  createLesson,
  createRegisteredUser,
  createTeacherAndStudent,
  createUser,
  getAs,
  jstSlot,
  sendJson,
} from "../test/factories";

type Connection = { socket: WebSocket; messages: string[] };

// 测试中打开的连接，每个测试结束时关闭
const openSockets: WebSocket[] = [];
afterEach(() => {
  for (const socket of openSockets.splice(0)) socket.close();
});

// 与前端相同的方式建立连接：ID token 放在子协议中，模拟用户用查询参数指定
function requestConnection(user: { lineUserId: string }, init: { upgrade?: boolean } = {}) {
  return app.request(
    `/api/realtime?${MOCK_USER_ID_QUERY}=${user.lineUserId}`,
    {
      headers: {
        ...(init.upgrade === false ? {} : { Upgrade: "websocket" }),
        "Sec-WebSocket-Protocol": `${REALTIME_PROTOCOL}, mock-token`,
      },
    },
    env,
  );
}

async function connect(user: { lineUserId: string }): Promise<Connection> {
  const res = await requestConnection(user);
  expect(res.status).toBe(101);
  expect(res.headers.get("Sec-WebSocket-Protocol")).toBe(REALTIME_PROTOCOL);
  const socket = res.webSocket;
  if (!socket) throw new Error("没有返回 WebSocket");
  socket.accept();
  openSockets.push(socket);
  const messages: string[] = [];
  socket.addEventListener("message", (event) => {
    messages.push(String(event.data));
  });
  return { socket, messages };
}

// 等待收到消息（最多 2 秒）
async function waitForMessage(connection: Connection) {
  for (let i = 0; i < 100 && connection.messages.length === 0; i++) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return connection.messages;
}

// 执行操作后，对方应收到「有变化」的通知
async function expectNotified(connection: Connection, action: () => Response | Promise<Response>) {
  connection.messages.length = 0;
  const res = await action();
  expect(res.status).toBe(200);
  expect(await waitForMessage(connection)).toEqual([JSON.stringify({ type: "changed" })]);
}

describe("实时通知的连接", () => {
  it("不是 WebSocket 请求时返回 426，没有登录时返回 401，未完成首次设置时返回 403", async () => {
    const student = await createRegisteredUser("student");
    expect((await requestConnection(student, { upgrade: false })).status).toBe(426);

    const noToken = await app.request("/api/realtime", { headers: { Upgrade: "websocket" } }, env);
    expect(noToken.status).toBe(401);

    expect((await requestConnection(await createUser())).status).toBe(403);
  });

  it("发送 ping 时回复 pong", async () => {
    const connection = await connect(await createRegisteredUser("student"));
    connection.socket.send(REALTIME_PING);
    expect(await waitForMessage(connection)).toEqual([REALTIME_PONG]);
  });
});

describe("数据有变化时的通知", () => {
  it("学生取消课程后，老师和管理员收到通知，学生自己不收到", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    const admin = await createRegisteredUser("student", { isAdmin: true });
    const lesson = await createLesson(relation, jstSlot(2, 10));
    const [teacherConn, studentConn, adminConn] = await Promise.all([
      connect(teacher),
      connect(student),
      connect(admin),
    ]);

    await expectNotified(teacherConn, () =>
      sendJson("POST", `/api/lessons/${lesson.id}/cancel`, student),
    );
    expect(await waitForMessage(adminConn)).toHaveLength(1);
    expect(studentConn.messages).toEqual([]);
  });

  it("与这个关系无关的人不收到通知", async () => {
    const { student, relation } = await createTeacherAndStudent();
    const outsider = await createRegisteredUser("teacher");
    const lesson = await createLesson(relation, jstSlot(2, 10));
    const outsiderConn = await connect(outsider);

    const res = await sendJson("POST", `/api/lessons/${lesson.id}/cancel`, student);
    expect(res.status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(outsiderConn.messages).toEqual([]);
  });

  it("各种操作后，对方都收到通知", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    const [teacherConn, studentConn] = await Promise.all([connect(teacher), connect(student)]);
    await addApprovedCredits(relation, 10);
    const relationPath = `/api/relations/${relation.id}`;

    // 课时申请：申请 → 老师；确认 → 学生
    let requestId = 0;
    await expectNotified(teacherConn, async () => {
      const res = await sendJson("POST", `${relationPath}/credit-requests`, student, { amount: 4 });
      requestId = (await res.clone().json<{ request: { id: number } }>()).request.id;
      return res;
    });
    await expectNotified(studentConn, () =>
      sendJson("POST", `/api/credit-requests/${requestId}/approve`, teacher),
    );

    // 排课：学生保存每周课程 → 老师；老师加单次课程 → 学生
    await expectNotified(teacherConn, () =>
      sendJson("PUT", `${relationPath}/weekly-schedules`, student, {
        slots: [{ weekday: 3, startHour: 20 }],
      }),
    );
    let lessonId = 0;
    await expectNotified(studentConn, async () => {
      const res = await sendJson("POST", `${relationPath}/lessons`, teacher, {
        startsAt: jstSlot(3, 9).getTime(),
      });
      lessonId = (await res.clone().json<{ lesson: { id: number } }>()).lesson.id;
      return res;
    });

    // 改时间 → 学生
    await expectNotified(studentConn, () =>
      sendJson("POST", `/api/lessons/${lessonId}/reschedule`, teacher, {
        startsAt: jstSlot(4, 9).getTime(),
      }),
    );

    // 留言：发出 → 老师；删除 → 老师
    let messageId = 0;
    await expectNotified(teacherConn, async () => {
      const res = await sendJson("POST", `/api/lessons/${lessonId}/messages`, student, {
        body: "你好",
      });
      messageId = (await res.clone().json<{ message: { id: number } }>()).message.id;
      return res;
    });
    await expectNotified(teacherConn, () =>
      sendJson("DELETE", `/api/messages/${messageId}`, student),
    );

    // 修改个人资料 → 老师
    await expectNotified(teacherConn, () =>
      sendJson("PATCH", "/api/me", student, { name: "新名字", introduction: "" }),
    );

    // 拒绝、撤回课时申请
    const pending = await sendJson("POST", `${relationPath}/credit-requests`, student, {
      amount: 2,
    });
    const pendingId = (await pending.json<{ request: { id: number } }>()).request.id;
    await expectNotified(studentConn, () =>
      sendJson("POST", `/api/credit-requests/${pendingId}/reject`, teacher, {}),
    );
    const another = await sendJson("POST", `${relationPath}/credit-requests`, student, {
      amount: 2,
    });
    const anotherId = (await another.json<{ request: { id: number } }>()).request.id;
    await expectNotified(teacherConn, () =>
      sendJson("POST", `/api/credit-requests/${anotherId}/withdraw`, student),
    );
  });

  it("对方接受邀请后，邀请人收到通知", async () => {
    const teacher = await createRegisteredUser("teacher");
    const student = await createRegisteredUser("student");
    const teacherConn = await connect(teacher);
    const created = await sendJson("POST", "/api/invitations", teacher);
    const { invitation } = await created.json<{ invitation: { code: string } }>();

    await expectNotified(teacherConn, () =>
      sendJson("POST", `/api/invitations/${invitation.code}/accept`, student),
    );
    expect((await getAs("/api/relations", teacher)).status).toBe(200);
  });
});
