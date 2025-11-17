export class DiagnosticService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.PROD 
      ? `${window.location.origin}/.netlify/functions`
      : 'http://localhost:8888/.netlify/functions';
  }

  async runDiagnostics() {
    const results = {
      environment: this.getEnvironmentInfo(),
      connectivity: await this.testConnectivity(),
      functions: await this.testFunctions(),
      database: await this.testDatabase()
    };

    return results;
  }

  private getEnvironmentInfo() {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      localStorage: this.testLocalStorage(),
      baseUrl: this.baseUrl
    };
  }

  private testLocalStorage() {
    try {
      const testKey = 'test_storage';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return { available: true };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  private async testConnectivity() {
    try {
      const response = await fetch('https://www.google.com/favicon.ico', { 
        mode: 'no-cors',
        cache: 'no-cache'
      });
      return { internet: true };
    } catch (error) {
      return { internet: false, error: error.message };
    }
  }

  private async testFunctions() {
    const tests = [];

    // Test fonction debug
    try {
      const response = await fetch(`${this.baseUrl}/debug`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      tests.push({
        function: 'debug',
        status: response.ok ? 'success' : 'error',
        response: result
      });
    } catch (error) {
      tests.push({
        function: 'debug',
        status: 'error',
        error: error.message
      });
    }

    // Test fonction auth
    try {
      const response = await fetch(`${this.baseUrl}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' })
      });
      
      const result = await response.json();
      tests.push({
        function: 'auth',
        status: response.ok ? 'success' : 'error',
        response: result
      });
    } catch (error) {
      tests.push({
        function: 'auth',
        status: 'error',
        error: error.message
      });
    }

    // Test fonction data
    try {
      const response = await fetch(`${this.baseUrl}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getUserData', userId: 'test-user' })
      });
      
      const result = await response.json();
      tests.push({
        function: 'data',
        status: response.ok ? 'success' : 'error',
        response: result
      });
    } catch (error) {
      tests.push({
        function: 'data',
        status: 'error',
        error: error.message
      });
    }

    return tests;
  }

  private async testDatabase() {
    try {
      const response = await fetch(`${this.baseUrl}/debug`);
      const result = await response.json();
      
      return {
        connection: result.success ? 'success' : 'error',
        tables: result.tables || [],
        counts: result.counts || {},
        details: result
      };
    } catch (error) {
      return {
        connection: 'error',
        error: error.message
      };
    }
  }

  async testAuthentication() {
    try {
      const response = await fetch(`${this.baseUrl}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: 'gobexpropriétaire',
          password: 'Ffreddy75@@7575xyzDistribpro2025',
          userType: 'Propriétaire'
        })
      });

      const result = await response.json();
      return {
        status: response.ok ? 'success' : 'error',
        response: result
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async testDebugFunction() {
    try {
      const response = await fetch(`${this.baseUrl}/debug`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      return {
        status: response.ok ? 'success' : 'error',
        response: result
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

export const diagnosticService = new DiagnosticService();