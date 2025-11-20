/**
 * Storage Service - Centralized storage with user_lot_id isolation
 *
 * This service ensures that all data stored in localStorage is isolated
 * by user_lot_id to prevent data leakage between user groups.
 */

class StorageService {
  private currentUserLotId: string | null = null;

  /**
   * Set the current user lot ID for data isolation
   */
  setUserLotId(userLotId: string | null): void {
    this.currentUserLotId = userLotId;
    console.log(`📦 StorageService: User lot ID set to ${userLotId || 'null'}`);
  }

  /**
   * Get the current user lot ID
   */
  getUserLotId(): string | null {
    return this.currentUserLotId;
  }

  /**
   * Get storage key with user_lot_id prefix for isolation
   */
  private getStorageKey(key: string): string {
    // If no user lot ID is set, use owner prefix for backward compatibility
    if (!this.currentUserLotId) {
      return `gobex_owner_${key}`;
    }
    return `gobex_${this.currentUserLotId}_${key}`;
  }

  /**
   * Get item from localStorage with user_lot_id isolation
   */
  getItem(key: string): string | null {
    const storageKey = this.getStorageKey(key);
    return localStorage.getItem(storageKey);
  }

  /**
   * Set item in localStorage with user_lot_id isolation
   */
  setItem(key: string, value: string): void {
    const storageKey = this.getStorageKey(key);
    localStorage.setItem(storageKey, value);
  }

  /**
   * Remove item from localStorage with user_lot_id isolation
   */
  removeItem(key: string): void {
    const storageKey = this.getStorageKey(key);
    localStorage.removeItem(storageKey);
  }

  /**
   * Get JSON data from localStorage
   */
  getJSON<T>(key: string, defaultValue: T): T {
    const data = this.getItem(key);
    if (!data) return defaultValue;

    try {
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Error parsing JSON from storage key ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Set JSON data in localStorage
   */
  setJSON<T>(key: string, value: T): void {
    this.setItem(key, JSON.stringify(value));
  }

  /**
   * Clear all data for current user group
   */
  clearUserData(): void {
    if (!this.currentUserLotId) {
      console.warn('No user lot ID set, cannot clear data');
      return;
    }

    const prefix = `gobex_${this.currentUserLotId}_`;
    const keysToRemove: string[] = [];

    // Find all keys for this user group
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    // Remove all keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ Cleared ${keysToRemove.length} items for user lot ${this.currentUserLotId}`);
  }

  /**
   * Get all storage keys for debugging
   */
  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  }

  /**
   * Debug: Log all keys for current user
   */
  debugCurrentUserKeys(): void {
    if (!this.currentUserLotId) {
      console.log('No user lot ID set');
      return;
    }

    const prefix = `gobex_${this.currentUserLotId}_`;
    const userKeys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        userKeys.push(key);
      }
    }

    console.log(`📦 Storage keys for user lot ${this.currentUserLotId}:`, userKeys);
  }
}

// Export singleton instance
export const storageService = new StorageService();
