/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { useLocation } from '../../hooks/useLocation';
import { LocationType } from '../../types/location.types';
import type { Location } from '../../types/location.types';

interface LocationSelectorProps {
  value?: string;
  onChange: (locationId: string) => void;
  filterType?: LocationType;
  label?: string;
  required?: boolean;
  showAll?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  value,
  onChange,
  filterType,
  label = 'Select Location',
  required = false,
  showAll = false,
  disabled = false,
  className = 'form-control',
  placeholder
}) => {
  const { getAllLocations, loading } = useLocation();
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const loadLocations = async () => {
      const result = await getAllLocations(filterType ? { type: filterType } : {});
      if (result?.success) {
        const responseData = result.data as unknown as { locations?: Location[] } | Location[];
        const locations = Array.isArray(responseData) ? responseData : responseData?.locations || [];
        setLocations(locations);
      }
    };
    loadLocations();
  }, [filterType]);

  const getLocationTypeLabel = (type: string) => {
    switch (type) {
      case 'WAREHOUSE': return '📦';
      case 'BRANCH': return '🏢';
      case 'STORE': return '🏪';
      case 'OUTLET': return '🏬';
      default: return '📍';
    }
  };

  return (
    <div className="form-group">
      {label && (
        <label>
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <select
        className={className}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled || loading}
      >
        <option value="">
          {showAll ? (placeholder || 'All Locations') : (placeholder || `-- Select ${label} --`)}
        </option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {getLocationTypeLabel(location.locationType)} {location.name} ({location.locationCode})
          </option>
        ))}
      </select>
      {loading && <small className="text-muted">Loading locations...</small>}
    </div>
  );
};

// Alternative: Location Selector with Type Badges
interface LocationCardSelectorProps extends LocationSelectorProps {
  showType?: boolean;
}

export const LocationCardSelector: React.FC<LocationCardSelectorProps> = ({
  value,
  onChange,
  filterType,
  showType = true,
  label = 'Select Location',
  required = false,
  showAll = false,
  disabled = false
}) => {
  const { getAllLocations, loading } = useLocation();
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const loadLocations = async () => {
      const result = await getAllLocations(filterType ? { type: filterType } : {});
      if (result?.success) {
        setLocations((result.data as Location[]) || []);
      }
    };
    loadLocations();
  }, [filterType, getAllLocations]);

  const getLocationTypeBadge = (type: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      WAREHOUSE: { class: 'badge-primary', label: 'Warehouse' },
      BRANCH: { class: 'badge-success', label: 'Branch' },
      STORE: { class: 'badge-info', label: 'Store' },
      OUTLET: { class: 'badge-warning', label: 'Outlet' }
    };
    return badges[type] || { class: 'badge-secondary', label: type };
  };

  return (
    <div className="form-group">
      {label && (
        <label>
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className="location-selector-cards">
        {showAll && (
          <div
            className={`location-card ${!value || value === 'all' ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onChange('')}
          >
            <div className="location-name">All Locations</div>
          </div>
        )}
        {locations.map((location) => {
          const badge = getLocationTypeBadge(location.locationType);
          return (
            <div
              key={location.id}
              className={`location-card ${value === location.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => !disabled && onChange(location.id)}
            >
              {showType && (
                <span className={`badge ${badge.class}`}>{badge.label}</span>
              )}
              <div className="location-name">{location.name}</div>
              <div className="location-code">{location.locationCode}</div>
            </div>
          );
        })}
      </div>
      {loading && <div className="text-center"><small className="text-muted">Loading locations...</small></div>}
    </div>
  );
};

export default LocationSelector;

