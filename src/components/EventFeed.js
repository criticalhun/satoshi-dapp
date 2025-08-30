// src/components/EventFeed.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { shortenAddress, getEventDisplayName, getRoleDisplayName } from '../utils/helpers';

export default function EventFeed({ 
  contract, 
  isVisible = false, 
  maxEvents = 20,
  className = "" 
}) {
  const [events, setEvents] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Event handlers
  const handleNewEvent = (eventName, ...args) => {
    const event = args[args.length - 1]; // Az utolsó argument mindig az event object
    const timestamp = new Date().toLocaleTimeString();
    
    let description = "";
    let severity = "info"; // info, success, warning, error

    switch (eventName) {
      case "Transfer":
        const [from, to, value] = args;
        const isMint = from === ethers.constants.AddressZero;
        const isBurn = to === ethers.constants.AddressZero;
        const amount = ethers.utils.formatUnits(value, 18);
        
        if (isMint) {
          description = `🪙 Minted ${parseFloat(amount).toFixed(4)} SATSTD to ${shortenAddress(to)}`;
          severity = "success";
        } else if (isBurn) {
          description = `🔥 Burned ${parseFloat(amount).toFixed(4)} SATSTD from ${shortenAddress(from)}`;
          severity = "warning";
        } else {
          description = `💸 Transfer ${parseFloat(amount).toFixed(4)} SATSTD: ${shortenAddress(from)} → ${shortenAddress(to)}`;
          severity = "info";
        }
        break;

      case "Paused":
        description = `⏸️ Contract paused by ${shortenAddress(args[0])}`;
        severity = "error";
        break;

      case "Unpaused":
        description = `▶️ Contract unpaused by ${shortenAddress(args[0])}`;
        severity = "success";
        break;

      case "RoleGranted":
        const [grantedRole, account, sender] = args;
        description = `✅ Role "${getRoleDisplayName(grantedRole)}" granted to ${shortenAddress(account)}`;
        severity = "success";
        break;

      case "RoleRevoked":
        const [revokedRole, revokedAccount, revokedSender] = args;
        description = `❌ Role "${getRoleDisplayName(revokedRole)}" revoked from ${shortenAddress(revokedAccount)}`;
        severity = "warning";
        break;

      case "ReserveFeedChanged":
        const [oldFeed, newFeed] = args;
        description = `🔄 Reserve feed changed: ${shortenAddress(oldFeed)} → ${shortenAddress(newFeed)}`;
        severity = "info";
        break;

      default:
        description = `📡 ${eventName} event occurred`;
        severity = "info";
    }

    const newEvent = {
      id: Date.now() + Math.random(),
      eventName,
      description,
      severity,
      timestamp,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber
    };

    setEvents(prev => [newEvent, ...prev.slice(0, maxEvents - 1)]);
  };

  // Event listener beállítás
  useEffect(() => {
    if (!contract) return;

    const eventNames = [
      "Transfer", 
      "Paused", 
      "Unpaused", 
      "RoleGranted", 
      "RoleRevoked", 
      "ReserveFeedChanged"
    ];

    // Event listener-ek beállítása
    eventNames.forEach(eventName => {
      contract.on(eventName, (...args) => {
        handleNewEvent(eventName, ...args);
      });
    });

    // Cleanup
    return () => {
      eventNames.forEach(eventName => {
        contract.removeAllListeners(eventName);
      });
    };
  }, [contract, maxEvents]);

  const getSeverityClasses = (severity) => {
    switch (severity) {
      case "success":
        return "border-l-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200";
      case "warning":
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200";
      case "error":
        return "border-l-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200";
      default:
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200";
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-40 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border max-w-sm">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Live Events ({events.length})
            </h3>
          </div>
          <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            {isExpanded ? "▼" : "▲"}
          </button>
        </div>

        {/* Events List */}
        {isExpanded && (
          <div className="max-h-80 overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                Waiting for blockchain events...
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className={`p-3 border-l-4 border-b last:border-b-0 ${getSeverityClasses(event.severity)} animate-fade-in`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {event.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1 text-xs opacity-75">
                        <span>{event.timestamp}</span>
                        {event.blockNumber && (
                          <span>#{event.blockNumber}</span>
                        )}
                      </div>
                    </div>
                    {event.txHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-xs hover:underline opacity-75 hover:opacity-100"
                        title="View on Etherscan"
                      >
                        🔗
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Clear Button */}
        {isExpanded && events.length > 0 && (
          <div className="p-2 border-t">
            <button
              onClick={() => setEvents([])}
              className="w-full text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 py-1 px-2 rounded transition-colors"
            >
              Clear Events
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Egyszerű toggle hook az EventFeed be/kikapcsolásához
export function useEventFeedToggle(defaultState = false) {
  const [isEventFeedVisible, setIsEventFeedVisible] = useState(defaultState);
  
  const toggleEventFeed = () => setIsEventFeedVisible(prev => !prev);
  
  return [isEventFeedVisible, toggleEventFeed];
}
