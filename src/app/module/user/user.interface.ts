export interface ICreateAdmin {
  password: string;
  admin: {
    name: string;
    email: string;
    profilePhoto?: string;
    contactNumber: string;
  };
  role: "ADMIN" | "SUPER_ADMIN";
}
