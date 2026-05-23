import { convertToModelMessages, type UIMessage } from "ai";

export async function toModelMessages(messages: UIMessage[]) {
  return convertToModelMessages(
    messages.map(({ id: _id, ...message }) => message),
    { ignoreIncompleteToolCalls: true },
  );
}
