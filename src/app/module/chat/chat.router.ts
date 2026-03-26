import { Router } from "express";
import { chatController } from "./chat.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ChatValidation } from "./chat.validation";
import { Role } from "../../../generated/prisma/enums";

const chatRouter = Router();

// Start or get existing conversation
chatRouter.post(
  "/conversations",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ChatValidation.startConversationZodSchema),
  chatController.startConversation,
);

// Get all my conversations
chatRouter.get(
  "/conversations",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  chatController.getMyConversations,
);

// Get messages for a conversation
chatRouter.get(
  "/conversations/:conversationId/messages",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  chatController.getMessages,
);

// Send message via REST (fallback if socket not connected)
chatRouter.post(
  "/conversations/:conversationId/messages",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ChatValidation.sendMessageZodSchema),
  chatController.sendMessage,
);

// Mark messages as read
chatRouter.patch(
  "/conversations/:conversationId/read",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  chatController.markMessagesAsRead,
);

export default chatRouter;
