/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from '../../hooks/useLocation';
import { LocationType } from '../../types/location.types';
import type { Location } from '../../types/location.types';
import SearchSelect from './SearchSelect';

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
      const result = await getAllLocations({
        ...(filterType ? { type: filterType } : {}),
        limit: 1000,
        isActive: true,
      });
      if (result?.success) {
        const responseData = result.data as unknown as { locations?: Location[]; data?: Location[] } | Location[];
        const locs = Array.isArray(responseData)
          ? responseData
          : responseData?.locations ?? responseData?.data ?? [];
        setLocations(locs);
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

  const options = useMemo(() => {
    const items = locations.map((location) => ({
      value: location.id,
      label: `${getLocationTypeLabel(location.locationType)} ${location.name}`,
      sublabel: location.locationCode,
    }));
    if (showAll) {
      return [{ value: '', label: placeholder || 'All Locations' }, ...items];
    }
    return items;
  }, [locations, showAll, placeholder]);

  return (
    <div className="form-group">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <SearchSelect
        options={options}
        value={value || ''}
        onChange={onChange}
        placeholder={showAll ? (placeholder || 'All Locations') : (placeholder || `-- Select ${label} --`)}
        disabled={disabled || loading}
        inputClassName={className.replace('form-control', '').trim()}
      />
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
      const result = await getAllLocations({
        ...(filterType ? { type: filterType } : {}),
        limit: 1000,
        isActive: true,
      });
      if (result?.success) {
        const responseData = result.data as unknown as { locations?: Location[]; data?: Location[] } | Location[];
        const locs = Array.isArray(responseData)
          ? responseData
          : responseData?.locations ?? responseData?.data ?? [];
        setLocations(locs);
      }
    };
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

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
