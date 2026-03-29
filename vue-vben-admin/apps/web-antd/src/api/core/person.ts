import { requestClient } from '#/api/request';

export interface PersonItem {
  _id: string;
  name: string;
  slug: string;
  avatarUrl: string;
  biography: string;
  gender: string;
  placeOfBirth: string;
  knownFor: string;
  views: number;
  score?: number;
}

export interface PersonListParams {
  page?: number;
  limit?: number;
  search?: string;
  knownFor?: string;
  sort?: string;
}

export async function getPersonsApi(params?: PersonListParams) {
  return requestClient.get('/persons', { params });
}

export async function createPersonApi(data: any) {
  return requestClient.post('/persons', data);
}

export async function updatePersonApi(id: string, data: any) {
  return requestClient.put(`/persons/${id}`, data);
}

export async function deletePersonApi(id: string) {
  return requestClient.delete(`/persons/${id}`);
}
