import { capitalize } from './capitalize';

describe('capitalize', () => {
  it('should capitalize lower case text', () => {
    const res = capitalize('lorem ipsum');

    expect(res).toEqual('Lorem ipsum');
  });

  it('should capitalize upper case text', () => {
    const res = capitalize('LOREM IPSUM');

    expect(res).toEqual('Lorem ipsum');
  });
});
