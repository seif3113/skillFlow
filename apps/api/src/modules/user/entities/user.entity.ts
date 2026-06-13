export interface User {
  id: number;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
  preferences?: any;
}
