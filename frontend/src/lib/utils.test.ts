/**
 * Unit tests for utility functions
 * Tests formatting, classname merging, and helper functions
 */

import { cn } from './utils';

describe('utils', () => {
  describe('cn() - classname merger', () => {
    it('should merge multiple class names', () => {
      const result = cn('foo', 'bar', 'baz');
      expect(result).toContain('foo');
      expect(result).toContain('bar');
      expect(result).toContain('baz');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('base', isActive && 'active');
      expect(result).toContain('base');
      expect(result).toContain('active');
    });

    it('should ignore falsy values', () => {
      const result = cn('foo', false, null, undefined, '', 'bar');
      expect(result).toContain('foo');
      expect(result).toContain('bar');
      expect(result).not.toContain('false');
      expect(result).not.toContain('null');
    });
  });
});
