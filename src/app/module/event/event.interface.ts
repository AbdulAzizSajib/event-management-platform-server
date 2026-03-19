export interface ICreateEvent {
  title: string;
  description: string;
  date: string;
  time: string;
  venue?: string;
  eventLink?: string;
  type?: "PUBLIC" | "PRIVATE";
  fee?: number;
}

export interface IUpdateEvent {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  venue?: string | null;
  eventLink?: string | null;
  type?: "PUBLIC" | "PRIVATE";
  fee?: number;
}
