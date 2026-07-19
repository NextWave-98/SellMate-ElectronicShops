/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from 'react';
import useFetch from './useFetch';

export const useCms = () => {
  const { fetchData } = useFetch();

  const getSettings = useCallback(async () => fetchData({ endpoint: '/cms/settings', method: 'GET', silent: true }), [fetchData]);
  const saveSettings = useCallback(async (data: any) => fetchData({ endpoint: '/cms/settings', method: 'PUT', data, successMessage: 'Website settings saved' }), [fetchData]);

  const listPages = useCallback(async () => fetchData({ endpoint: '/cms/pages', method: 'GET', silent: true }), [fetchData]);
  const createPage = useCallback(async (data: any) => fetchData({ endpoint: '/cms/pages', method: 'POST', data, successMessage: 'Page created' }), [fetchData]);
  const updatePage = useCallback(async (id: string, data: any) => fetchData({ endpoint: `/cms/pages/${id}`, method: 'PUT', data, successMessage: 'Page updated' }), [fetchData]);
  const deletePage = useCallback(async (id: string) => fetchData({ endpoint: `/cms/pages/${id}`, method: 'DELETE', successMessage: 'Page deleted' }), [fetchData]);

  const listPosts = useCallback(async () => fetchData({ endpoint: '/cms/posts', method: 'GET', silent: true }), [fetchData]);
  const createPost = useCallback(async (data: any) => fetchData({ endpoint: '/cms/posts', method: 'POST', data, successMessage: 'Post created' }), [fetchData]);
  const updatePost = useCallback(async (id: string, data: any) => fetchData({ endpoint: `/cms/posts/${id}`, method: 'PUT', data, successMessage: 'Post updated' }), [fetchData]);
  const deletePost = useCallback(async (id: string) => fetchData({ endpoint: `/cms/posts/${id}`, method: 'DELETE', successMessage: 'Post deleted' }), [fetchData]);

  const listTestimonials = useCallback(async () => fetchData({ endpoint: '/cms/testimonials', method: 'GET', silent: true }), [fetchData]);
  const createTestimonial = useCallback(async (data: any) => fetchData({ endpoint: '/cms/testimonials', method: 'POST', data, successMessage: 'Testimonial added' }), [fetchData]);
  const deleteTestimonial = useCallback(async (id: string) => fetchData({ endpoint: `/cms/testimonials/${id}`, method: 'DELETE', successMessage: 'Testimonial deleted' }), [fetchData]);

  return useMemo(
    () => ({
      getSettings, saveSettings,
      listPages, createPage, updatePage, deletePage,
      listPosts, createPost, updatePost, deletePost,
      listTestimonials, createTestimonial, deleteTestimonial,
    }),
    [
      getSettings, saveSettings,
      listPages, createPage, updatePage, deletePage,
      listPosts, createPost, updatePost, deletePost,
      listTestimonials, createTestimonial, deleteTestimonial,
    ]
  );
};

export default useCms;
