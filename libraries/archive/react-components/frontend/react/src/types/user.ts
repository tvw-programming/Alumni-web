export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  phone: string;
  gender?: string;
  /** dummyjson format: "1996-5-30" */
  birthDate?: string;
  company?: {
    name?: string;
    title?: string;
  };
}

export interface UserListResponse {
  users: User[];
  total: number;
  skip: number;
  limit: number;
}

export interface UserListFilters {
  search: string;
}

export interface NewUser {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
}
