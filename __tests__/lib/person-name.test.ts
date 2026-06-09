import { joinFullName, splitFullName } from '@/lib/person-name';

describe('splitFullName', () => {
  it('splits first token and remainder', () => {
    expect(splitFullName('Jane Marie Doe')).toEqual({
      first_name: 'Jane',
      last_name: 'Marie Doe',
    });
  });

  it('uses entire string as first name when no space', () => {
    expect(splitFullName('Madonna')).toEqual({
      first_name: 'Madonna',
      last_name: '',
    });
  });

  it('returns empty parts for blank input', () => {
    expect(splitFullName('   ')).toEqual({ first_name: '', last_name: '' });
  });
});

describe('joinFullName', () => {
  it('joins first and last name', () => {
    expect(joinFullName('Jane', 'Doe')).toBe('Jane Doe');
  });
});
