import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Save, Loader2, Ruler } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';

const DEFAULT_VALUES = {
  // Basic Information
  height: '170',
  weight: '70',
  age: '30',

  // Body Measurements
  neck: '37',
  chest: '94',
  waist: '78',
  hips: '106',
  inseam: '80',

  // Arm Measurements
  shoulder: '45',
  sleeve: '60',
  bicep: '27',
  forearm: '24',

  // Leg Measurements
  thigh: '54',
  calf: '38',
  ankles: '22'
};

const MEASUREMENT_GROUPS = {
  basic: {
    title: 'Basic Information',
    fields: {
      height: { label: 'Height', unit: 'cm', default: DEFAULT_VALUES.height },
      weight: { label: 'Weight', unit: 'kg', default: DEFAULT_VALUES.weight },
      age: { label: 'Age', unit: 'years', default: DEFAULT_VALUES.age }
    }
  },
  body: {
    title: 'Body Measurements',
    fields: {
      neck: { label: 'Neck', unit: 'cm', default: DEFAULT_VALUES.neck },
      chest: { label: 'Chest', unit: 'cm', default: DEFAULT_VALUES.chest },
      waist: { label: 'Waist', unit: 'cm', default: DEFAULT_VALUES.waist },
      hips: { label: 'Hips', unit: 'cm', default: DEFAULT_VALUES.hips },
      inseam: { label: 'Inseam', unit: 'cm', default: DEFAULT_VALUES.inseam }
    }
  },
  arms: {
    title: 'Arm Measurements',
    fields: {
      shoulder: { label: 'Shoulder Width', unit: 'cm', default: DEFAULT_VALUES.shoulder },
      sleeve: { label: 'Sleeve Length', unit: 'cm', default: DEFAULT_VALUES.sleeve },
      bicep: { label: 'Bicep', unit: 'cm', default: DEFAULT_VALUES.bicep },
      forearm: { label: 'Forearm', unit: 'cm', default: DEFAULT_VALUES.forearm }
    }
  },
  legs: {
    title: 'Leg Measurements',
    fields: {
      thigh: { label: 'Thigh', unit: 'cm', default: DEFAULT_VALUES.thigh },
      calf: { label: 'Calf', unit: 'cm', default: DEFAULT_VALUES.calf },
      ankles: { label: 'Ankles', unit: 'cm', default: DEFAULT_VALUES.ankles }
    }
  }
};

const UserProfile = () => {
  const [measurements, setMeasurements] = useState(() => {
    // Create initial state using defaults
    const initialState = {};
    Object.entries(MEASUREMENT_GROUPS).forEach(([_, group]) => {
      Object.entries(group.fields).forEach(([key, field]) => {
        initialState[key] = field.default;
      });
    });
    return initialState;
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const result = await chrome.storage.local.get('userProfile');
      if (result.userProfile) {
        setMeasurements(result.userProfile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load profile'
      });
    }
  };

  const handleInputChange = (key, value) => {
    setMeasurements(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await chrome.storage.local.set({
        userProfile: measurements
      });

      setMessage({
        type: 'success',
        text: 'Profile saved successfully'
      });

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save profile'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Ruler className="w-5 h-5" />
          My Measurements
        </h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700
                   disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save
        </button>
      </div>

      {/* Message Alert */}
      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Measurement Groups */}
      {Object.entries(MEASUREMENT_GROUPS).map(([groupKey, group]) => (
        <div key={groupKey} className="space-y-3">
          <h3 className="font-medium text-gray-300">{group.title}</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(group.fields).map(([fieldKey, field]) => (
              <div key={fieldKey} className="space-y-1">
                <label
                  htmlFor={fieldKey}
                  className="block text-sm text-gray-400"
                >
                  {field.label}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id={fieldKey}
                    value={measurements[fieldKey] || ''}
                    onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg
                             px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500
                             focus:border-purple-500"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2
                                 text-gray-500 text-sm">
                    {field.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="text-sm text-gray-500">
        * All measurements should be in specified units
      </div>
    </div>
  );
};

export default UserProfile;