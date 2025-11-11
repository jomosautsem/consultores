export enum UserRole {
  LEVEL_1 = 'LEVEL_1',
  LEVEL_2 = 'LEVEL_2',
  LEVEL_3 = 'LEVEL_3',
}

export enum SatStatus {
  AL_CORRIENTE = 'Al corriente',
  CON_ADEUDOS = 'Con adeudos',
  EN_REVISION = 'En revisión',
  PENDIENTE = 'Pendiente',
}

export interface User {
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface ClientAdmin {
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  phone: string;
  eFirma?: string;
  csf?: string;
}

export interface Client {
  id: string;
  companyName: string;
  legalName: string;
  location: string;
  email: string;
  phone: string;
  admin: ClientAdmin;
  rfc: string;
  eFirma?: string; // file name placeholder
  csf?: string; // file name placeholder
  password?: string;
  satStatus: SatStatus;
  isActive: boolean;
}

export interface Message {
  id: string;
  clientId: string;
  sender: 'client' | 'admin';
  content: string;
  timestamp: string;
}