import type { UIMessage } from "ai";

function getMessagePreview(message: UIMessage, maxLength = 120): string {
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (!text) {
    return "(No text)";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

export type MessageDeleteDialogCopy = {
  preview: string;
  title: string;
  description: string;
};

export function describeMessageDeletion(
  messages: UIMessage[],
  messageId: string,
): MessageDeleteDialogCopy | null {
  const index = messages.findIndex((message) => message.id === messageId);
  if (index === -1) {
    return null;
  }

  const target = messages[index]!;
  const preview = getMessagePreview(target);

  if (target.role === "user") {
    let end = index + 1;
    while (end < messages.length && messages[end]?.role !== "user") {
      end += 1;
    }

    const assistantCount = end - index - 1;

    return {
      preview,
      title: "Delete this message?",
      description:
        assistantCount > 0
          ? `Your message and ${assistantCount === 1 ? "its assistant reply" : `${assistantCount} assistant replies`} will be removed. This cannot be undone.`
          : "Your message will be removed from this chat. This cannot be undone.",
    };
  }

  return {
    preview,
    title: "Delete this message?",
    description:
      "This assistant message will be removed from the chat. This cannot be undone.",
  };
}

/** Remove a user message and its assistant reply(ies), or a single assistant message. */
export function deleteChatMessage(
  messages: UIMessage[],
  messageId: string,
): UIMessage[] {
  const index = messages.findIndex((message) => message.id === messageId);
  if (index === -1) {
    return messages;
  }

  const target = messages[index];
  if (target?.role === "user") {
    let end = index + 1;
    while (end < messages.length && messages[end]?.role !== "user") {
      end += 1;
    }
    return [...messages.slice(0, index), ...messages.slice(end)];
  }

  return messages.filter((message) => message.id !== messageId);
}
