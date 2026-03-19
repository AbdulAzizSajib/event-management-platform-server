export interface IJoinEvent {
  eventId: string;
}

export interface IUpdateParticipantStatus {
  status: "APPROVED" | "REJECTED" | "BANNED";
}
