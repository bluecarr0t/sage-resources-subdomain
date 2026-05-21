import {
  SAGE_CONTENT_AUTHOR_NAME,
  generateSageContentAuthorSchema,
} from '@/lib/sage-content-author';

describe('sage-content-author', () => {
  it('uses Sage Outdoor Advisory as the author name', () => {
    expect(SAGE_CONTENT_AUTHOR_NAME).toBe('Sage Outdoor Advisory');
    expect(generateSageContentAuthorSchema()).toEqual({
      '@type': 'Organization',
      name: 'Sage Outdoor Advisory',
      url: 'https://sageoutdooradvisory.com',
    });
  });
});
