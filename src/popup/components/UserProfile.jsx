import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Save, Loader2, Ruler, User, Sliders, RulerIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Panel } from '@/components/ui/theme';

// Map CSV column names to our schema fields
const CSV_FIELD_MAPPING = {
  neck: 'neck',
  waist: 'waist',
  hips: 'hips',
  chest: 'chest',
  right_bicep: 'bicep',
  right_forearm: 'forearm',
  right_thigh: 'thigh',
  right_calf: 'calf',
  left_thigh: 'thigh',
  left_forearm: 'forearm',
  left_bicep: 'bicep',
  left_calf: 'calf'
};

const MEASUREMENT_SCHEMA = {
  personal: {
    title: 'Personal Information',
    icon: User,
    fields: {
      gender: {
        label: 'Gender',
        type: 'select',
        options: ['male', 'female', 'other'],
        default: 'male'
      },
      age: {
        label: 'Age',
        type: 'number',
        unit: 'years',
        default: '30',
        min: 1,
        max: 120
      },
      height: {
        label: 'Height',
        type: 'number',
        unit: 'cm',
        default: '170',
        min: 50,
        max: 250
      },
      weight: {
        label: 'Weight',
        type: 'number',
        unit: 'kg',
        default: '70',
        min: 20,
        max: 300
      }
    }
  },
  preferences: {
    title: 'Fit Preferences',
    icon: Sliders,
    fields: {
      preferredFit: {
        label: 'Preferred Fit',
        type: 'select',
        options: [
          { value: 'fitted', label: 'Fitted - Close to body' },
          { value: 'regular', label: 'Regular - Standard fit' },
          { value: 'loose', label: 'Loose - Relaxed fit' }
        ],
        default: 'regular'
      },
      sizePreference: {
        label: 'When between sizes',
        type: 'select',
        options: [
          { value: 'smaller', label: 'I usually size down' },
          { value: 'larger', label: 'I usually size up' },
          { value: 'depends', label: 'Depends on the item' }
        ],
        default: 'depends'
      },
      commonIssues: {
        label: 'Common Fit Issues',
        type: 'multiselect',
        options: [
          { value: 'sleeves_long', label: 'Sleeves often too long' },
          { value: 'sleeves_short', label: 'Sleeves often too short' },
          { value: 'shoulders_wide', label: 'Shoulders often too wide' },
          { value: 'shoulders_narrow', label: 'Shoulders often too narrow' },
          { value: 'waist_loose', label: 'Waist often too loose' },
          { value: 'waist_tight', label: 'Waist often too tight' },
          { value: 'length_long', label: 'Length often too long' },
          { value: 'length_short', label: 'Length often too short' }
        ],
        default: []
      }
    }
  },
  upperBody: {
    title: 'Upper Body Measurements',
    icon: Ruler,
    fields: {
      neck: {
        label: 'Neck',
        type: 'number',
        unit: 'cm',
        default: '37',
        min: 25,
        max: 60,
        instructions: 'Measure around the base of the neck'
      },
      chest: {
        label: 'Chest',
        type: 'number',
        unit: 'cm',
        default: '94',
        min: 60,
        max: 160,
        instructions: 'Measure around the fullest part of your chest'
      },
      waist: {
        label: 'Waist',
        type: 'number',
        unit: 'cm',
        default: '78',
        min: 50,
        max: 150,
        instructions: 'Measure around your natural waistline'
      },
      hips: {
        label: 'Hips',
        type: 'number',
        unit: 'cm',
        default: '106',
        min: 70,
        max: 170,
        instructions: 'Measure around the fullest part of your hips'
      }
    }
  },
  arms: {
    title: 'Arm Measurements',
    icon: RulerIcon,
    fields: {
      bicep: {
        label: 'Bicep',
        type: 'number',
        unit: 'cm',
        default: '27',
        min: 15,
        max: 50,
        instructions: 'Measure around the fullest part of your upper arm'
      },
      forearm: {
        label: 'Forearm',
        type: 'number',
        unit: 'cm',
        default: '24',
        min: 15,
        max: 45,
        instructions: 'Measure around the fullest part of your forearm'
      }
    }
  },
  lowerBody: {
    title: 'Lower Body Measurements',
    icon: RulerIcon,
    fields: {
      thigh: {
        label: 'Thigh',
        type: 'number',
        unit: 'cm',
        default: '54',
        min: 30,
        max: 90,
        instructions: 'Measure around the fullest part of your thigh'
      },
      calf: {
        label: 'Calf',
        type: 'number',
        unit: 'cm',
        default: '38',
        min: 20,
        max: 60,
        instructions: 'Measure around the fullest part of your calf'
      }
    }
  }
};

const UserProfile = () => {
  const [measurements, setMeasurements] = useState({});
  const [activeSection, setActiveSection] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedField, setSelectedField] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const result = await chrome.storage.local.get('userProfile');
      if (result.userProfile) {
        setMeasurements(result.userProfile);
      } else {
        // Initialize with defaults
        const defaults = {};
        Object.entries(MEASUREMENT_SCHEMA).forEach(([_, section]) => {
          Object.entries(section.fields).forEach(([key, field]) => {
            defaults[key] = field.default;
          });
        });
        setMeasurements(defaults);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load profile'
      });
    }
  };

  const handleInputChange = (key, value, fieldType = 'text') => {
    let processedValue = value;

    if (fieldType === 'number') {
      processedValue = value === '' ? '' : Number(value);
      const field = Object.values(MEASUREMENT_SCHEMA)
        .flatMap(section => Object.entries(section.fields))
        .find(([k]) => k === key)?.[1];

      if (field) {
        if (processedValue < field.min) processedValue = field.min;
        if (processedValue > field.max) processedValue = field.max;
      }
    } else if (fieldType === 'multiselect') {
      const currentValues = measurements[key] || [];
      processedValue = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
    }

    setMeasurements(prev => ({
      ...prev,
      [key]: processedValue
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await chrome.storage.local.set({
        userProfile: {
          ...measurements,
          lastUpdated: new Date().toISOString()
        }
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

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let importedData;

      if (file.name.endsWith('.json')) {
        importedData = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        importedData = parseCsvMeasurements(text);
      }

      // Validate imported data
      const validatedData = validateMeasurements(importedData);

      // Update measurements
      setMeasurements(prev => ({
        ...prev,
        ...validatedData,
        lastUpdated: new Date().toISOString()
      }));

      setMessage({
        type: 'success',
        text: 'Measurements imported successfully'
      });
    } catch (error) {
      console.error('Import error:', error);
      setMessage({
        type: 'error',
        text: 'Failed to import measurements'
      });
    }
  };

  const handleExport = () => {
    const exportData = {
      ...measurements,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `measurements-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseCsvMeasurements = (csvText) => {
    try {
      const [headers, values] = csvText.trim().split('\n');
      const fields = headers.split(',');
      const measurements = values.split(',');

      // Create a mapped object using our CSV field mapping
      const mappedData = {};
      fields.forEach((field, index) => {
        const cleanField = field.trim();
        const mappedField = CSV_FIELD_MAPPING[cleanField];

        if (mappedField) {
          const value = measurements[index]?.trim();
          if (value) {
            // For fields that have both left and right measurements, take the average
            if (mappedData[mappedField]) {
              const currentValue = parseFloat(mappedData[mappedField]);
              const newValue = parseFloat(value.replace(/[^0-9.]/g, ''));
              mappedData[mappedField] = ((currentValue + newValue) / 2).toFixed(1);
            } else {
              mappedData[mappedField] = value.replace(/[^0-9.]/g, '');
            }
          }
        }
      });

      return mappedData;
    } catch (error) {
      console.error('CSV parsing error:', error);
      throw new Error('Invalid CSV format');
    }
  };

  const validateMeasurements = (data) => {
    const validated = {};

    // Validate each measurement against schema
    Object.entries(MEASUREMENT_SCHEMA).forEach(([sectionKey, section]) => {
      Object.entries(section.fields).forEach(([fieldKey, field]) => {
        if (data[fieldKey] !== undefined) {
          if (field.type === 'number') {
            const value = Number(data[fieldKey]);
            if (!isNaN(value) && value >= field.min && value <= field.max) {
              validated[fieldKey] = value;
            }
          } else if (field.type === 'select') {
            if (field.options.some(opt =>
              (typeof opt === 'object' ? opt.value : opt) === data[fieldKey]
            )) {
              validated[fieldKey] = data[fieldKey];
            }
          } else if (field.type === 'multiselect' && Array.isArray(data[fieldKey])) {
            validated[fieldKey] = data[fieldKey].filter(value =>
              field.options.some(opt => opt.value === value)
            );
          } else {
            validated[fieldKey] = data[fieldKey];
          }
        }
      });
    });

    return validated;
  };

  const renderField = (key, field) => {
    switch (field.type) {
      case 'select':
        return (
          <select
            value={measurements[key] || field.default}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                     text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          >
            {field.options.map(option => {
              const value = typeof option === 'object' ? option.value : option;
              const label = typeof option === 'object' ? option.label : option;
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options.map(option => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(measurements[key] || []).includes(option.value)}
                  onChange={() => handleInputChange(key, option.value, 'multiselect')}
                  className="rounded border-gray-700 bg-gray-800 text-purple-500
                           focus:ring-purple-500"
                />
                <span className="text-sm text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'number':
        return (
          <div className="relative">
            <input
              type="number"
              value={measurements[key] || ''}
              onChange={(e) => handleInputChange(key, e.target.value, 'number')}
              min={field.min}
              max={field.max}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg
                       px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500
                       focus:border-purple-500 pr-12"
              placeholder={`Enter ${field.label.toLowerCase()}`}
              onFocus={() => {
                setShowInstructions(true);
                setSelectedField(key);
              }}
            />
            {field.unit && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2
                             text-gray-500 text-sm">
                {field.unit}
              </span>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={measurements[key] || ''}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg
                     px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500
                     focus:border-purple-500"
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5" />
          My Profile
        </h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700
                   disabled:opacity-50 flex items-center gap-2 text-white"
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

      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Object.entries(MEASUREMENT_SCHEMA).map(([key, section]) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap
                     transition-colors
                     ${activeSection === key
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
          >
            <section.icon className="w-4 h-4" />
            <span>{section.title}</span>
          </button>
        ))}
      </div>

      {/* Active Section Content */}
      <div className="space-y-6">
        {MEASUREMENT_SCHEMA[activeSection] && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(MEASUREMENT_SCHEMA[activeSection].fields).map(([key, field]) => (
              <div key={key} className="space-y-1">
                <label
                  htmlFor={key}
                  className="block text-sm text-gray-400"
                >
                  {field.label}
                </label>
                {renderField(key, field)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Measurement Instructions */}
      {showInstructions && selectedField && (
        <Panel className="mt-4">
          <h4 className="text-sm font-medium text-purple-400 mb-2">
            How to Measure
          </h4>
          <p className="text-sm text-gray-300">
            {MEASUREMENT_SCHEMA[activeSection]?.fields[selectedField]?.instructions}
          </p>
          <button
            onClick={() => setShowInstructions(false)}
            className="text-sm text-purple-400 hover:text-purple-300 mt-2"
          >
            Hide instructions
          </button>
        </Panel>
      )}

      {/* Sizing Tips */}
      <Panel className="mt-6 bg-purple-900/20">
        <div className="flex items-start gap-3">
          <Ruler className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-sm font-medium text-purple-400 mb-1">
              Measurement Tips
            </h3>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Use a flexible measuring tape for accurate measurements</li>
              <li>• Measure directly against skin or light clothing</li>
              <li>• Keep the measuring tape snug but not tight</li>
              <li>• Stand straight and relaxed while measuring</li>
              <li>• For best results, have someone help you measure</li>
            </ul>
          </div>
        </div>
      </Panel>

      {/* Import/Export Section */}
      <div className="flex gap-2 mt-6">
        <button
          onClick={handleExport}
          className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700
                   rounded-lg text-sm text-gray-300 transition-colors"
        >
          Export Measurements
        </button>
        <label className="flex-1">
          <input
            type="file"
            accept=".json,.csv"
            onChange={handleImport}
            className="hidden"
          />
          <span className="block px-4 py-2 bg-gray-800 hover:bg-gray-700
                        rounded-lg text-sm text-gray-300 transition-colors
                        text-center cursor-pointer">
            Import Measurements
          </span>
        </label>
      </div>

      {/* Last Updated */}
      {measurements.lastUpdated && (
        <div className="text-sm text-gray-500 mt-4">
          Last updated: {new Date(measurements.lastUpdated).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default UserProfile;