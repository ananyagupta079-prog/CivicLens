import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

export const fetchFeed = async () => {
  const response = await api.get('/feed/');
  return response.data;
};

export const createPost = async (postData: any) => {
  const response = await api.post('/posts/', postData);
  return response.data;
};

export const editPost = async (postId: number, newDescription: string) => {
  const response = await api.put(`/posts/${postId}/edit`, { new_description: newDescription });
  return response.data;
};
