import React, { useEffect, useState } from 'react'
import { API_CONFIG } from './src/config'

interface BackendStatus {
  online: boolean;
  status?: any;
  error?: string;
  timestamp: number;
}

interface LastMatch {
  title: string;
  bagId: number;
  timestamp: number;
}

const Popup: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [lastMatch, setLastMatch] = useState<LastMatch | null>(null);
  const [currentProduct, setCurrentProduct] = useState<string>('');
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load settings and status from storage
      const storage = await chrome.storage.local.get([
        'lastHealthCheck',
        'lastMatchedProduct', 
        'isEnabled',
        'debugMode'
      ]);

      if (storage.lastHealthCheck) {
        setBackendStatus(storage.lastHealthCheck);
      }

      if (storage.lastMatchedProduct) {
        setLastMatch(storage.lastMatchedProduct);
      }

      setIsEnabled(storage.isEnabled ?? true);
      setDebugMode(storage.debugMode ?? false);

      // Get current product from active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.url?.includes('tiktok.com')) {
        try {
          const response = await chrome.tabs.sendMessage(tabs[0].id!, { 
            type: 'GET_CURRENT_PRODUCT' 
          });
          setCurrentProduct(response?.title || '');
        } catch (error) {
          console.log('No content script on current tab');
        }
      }

    } catch (error) {
      console.error('Error loading popup data:', error);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'TEST_CONNECTION' });
      
      if (response.success) {
        setBackendStatus({
          online: true,
          status: response.apiStatus?.status,
          timestamp: Date.now()
        });
      } else {
        setBackendStatus({
          online: false,
          error: response.message,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      setBackendStatus({
        online: false,
        error: 'Extension error: ' + error.message,
        timestamp: Date.now()
      });
    }
    setIsLoading(false);
  };

  const forceProductCheck = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.url?.includes('tiktok.com')) {
        await chrome.tabs.sendMessage(tabs[0].id!, { type: 'FORCE_CHECK' });
        // Reload current product after a short delay
        setTimeout(() => {
          chrome.tabs.sendMessage(tabs[0].id!, { 
            type: 'GET_CURRENT_PRODUCT' 
          }).then(response => {
            setCurrentProduct(response?.title || '');
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Error forcing product check:', error);
    }
  };

  const toggleEnabled = async () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    await chrome.storage.local.set({ isEnabled: newEnabled });
  };

  const toggleDebug = async () => {
    const newDebug = !debugMode;
    setDebugMode(newDebug);
    await chrome.storage.local.set({ debugMode: newDebug });
    
    // Notify content scripts
    const tabs = await chrome.tabs.query({ url: '*://*.tiktok.com/*' });
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id!, { 
          type: 'TOGGLE_DEBUG', 
          enabled: newDebug 
        });
      } catch (error) {
        // Ignore errors for tabs without content scripts
      }
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return new Date(timestamp).toLocaleDateString();
    }
  };

  return (
    <div style={{ 
      width: '350px', 
      padding: '16px', 
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px'
    }}>
      {/* Header */}
      <div style={{ 
        borderBottom: '2px solid #e0e0e0', 
        paddingBottom: '12px', 
        marginBottom: '16px' 
      }}>
        <h3 style={{ 
          margin: '0 0 8px 0', 
          color: '#1976d2',
          fontSize: '18px'
        }}>
          🎯 TikTok Streamer Helper
        </h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '12px',
          color: '#666'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: backendStatus?.online ? '#4CAF50' : '#F44336'
          }}></div>
          Backend: {backendStatus?.online ? 'Connected' : 'Disconnected'}
          {backendStatus && (
            <span style={{ fontSize: '11px', color: '#999' }}>
              ({formatTimestamp(backendStatus.timestamp)})
            </span>
          )}
        </div>
      </div>

      {/* Current Product */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Current Product</h4>
        <div style={{ 
          background: '#f5f5f5', 
          padding: '8px', 
          borderRadius: '4px',
          minHeight: '40px',
          fontSize: '12px',
          color: currentProduct ? '#333' : '#999'
        }}>
          {currentProduct || 'No product detected'}
        </div>
        <button 
          onClick={forceProductCheck}
          style={{
            marginTop: '8px',
            padding: '6px 12px',
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Refresh Product
        </button>
      </div>

      {/* Last Match */}
      {lastMatch && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Last Match</h4>
          <div style={{ 
            background: '#e8f5e8', 
            padding: '8px', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <div><strong>Bag ID:</strong> {lastMatch.bagId}</div>
            <div><strong>Title:</strong> {lastMatch.title}</div>
            <div style={{ color: '#666', fontSize: '11px' }}>
              {formatTimestamp(lastMatch.timestamp)}
            </div>
          </div>
        </div>
      )}

      {/* Backend Status */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Backend Status</h4>
        <div style={{ 
          background: backendStatus?.online ? '#e8f5e8' : '#ffebee',
          padding: '8px', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <div>
            <strong>API:</strong> {API_CONFIG.baseUrl}
          </div>
          {backendStatus?.error && (
            <div style={{ color: '#d32f2f', marginTop: '4px' }}>
              <strong>Error:</strong> {backendStatus.error}
            </div>
          )}
          {backendStatus?.status && (
            <div style={{ marginTop: '4px' }}>
              <strong>Features:</strong> WebSocket, CSV Import, Analytics
            </div>
          )}
        </div>
        <button 
          onClick={testConnection}
          disabled={isLoading}
          style={{
            marginTop: '8px',
            padding: '6px 12px',
            background: isLoading ? '#ccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          {isLoading ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {/* Settings */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Settings</h4>
        
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '8px',
          cursor: 'pointer',
          fontSize: '12px'
        }}>
          <input 
            type="checkbox" 
            checked={isEnabled}
            onChange={toggleEnabled}
            style={{ marginRight: '8px' }}
          />
          Extension Enabled
        </label>
        
        <label style={{ 
          display: 'flex', 
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '12px'
        }}>
          <input 
            type="checkbox" 
            checked={debugMode}
            onChange={toggleDebug}
            style={{ marginRight: '8px' }}
          />
          Debug Mode
        </label>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Quick Actions</h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => chrome.tabs.create({ url: API_CONFIG.baseUrl + '/docs' })}
            style={{
              padding: '6px 12px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            API Docs
          </button>
          <button 
            onClick={() => chrome.tabs.create({ url: 'http://localhost:3000' })}
            style={{
              padding: '6px 12px',
              background: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Admin Panel
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ 
        fontSize: '11px', 
        color: '#666',
        borderTop: '1px solid #e0e0e0',
        paddingTop: '12px'
      }}>
        <strong>Instructions:</strong>
        <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
          <li>Navigate to TikTok Studio or Seller Center</li>
          <li>Select products to automatically send to teleprompter</li>
          <li>Green notifications = product found</li>
          <li>Orange notifications = product missing</li>
        </ul>
      </div>
    </div>
  );
};

export default Popup; 