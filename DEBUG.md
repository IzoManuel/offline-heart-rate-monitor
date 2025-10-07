# Debug Mode Documentation

This document explains how to use the debug recording and playback system for testing the heart rate monitor app without physical Bluetooth hardware.

## Overview

The debug system allows you to:
1. **Record** real Bluetooth heart rate sessions to JSON files
2. **Download** recordings for later use
3. **Upload** and **replay** recordings to test the UI without hardware

All controls are accessible via the browser console.

## Recording a Session

### Step 1: Connect to a Real Device

Connect to your heart rate monitor using the "Connect to HR Monitor" button in the UI as normal.

### Step 2: Start Recording

Open the browser console (F12) and run:

```javascript
window.hrDebug.startRecording()
```

This will begin capturing all heart rate readings from the connected device. The device name will be automatically detected from the currently connected device.

**Optional**: You can override the device name if needed:

```javascript
window.hrDebug.startRecording('Custom Device Name')
```

### Step 3: Use the Device

Exercise or move around to generate heart rate data. The debug system will record every reading along with timestamps.

### Step 4: Stop Recording

When you're done, stop the recording:

```javascript
window.hrDebug.stopRecording()
```

You'll see a console message showing how many readings were captured.

### Step 5: Download the Recording

Save the recording as a JSON file:

```javascript
window.hrDebug.downloadRecording()
```

Your browser will download a file named `hr-session-YYYY-MM-DD-HH-MM-SS.json` containing the full session data.

## Playing Back a Recording

### Step 1: Make Sure You're Disconnected

If you're connected to a real device, disconnect first using the "Disconnect" button.

### Step 2: Load and Start Playback

In the browser console, run:

```javascript
window.hrPlayback.start()
```

This will:
1. Open a file picker dialog
2. Ask you to select a previously downloaded recording JSON file
3. Automatically start playback at 1x speed (real-time)
4. Update the UI as if a real device were connected

The device name will show as `[Device Name] (Playback)` to indicate playback mode.

### Step 3: Watch the Playback

The UI will update with each recorded reading at the same intervals they were originally captured. Statistics (average, max, min) will be calculated just like with a real device.

### Step 4: Stop Playback (Optional)

To stop playback before it finishes:

```javascript
window.hrPlayback.stop()
```

Or simply click the "Disconnect" button in the UI.

## Recording File Format

Recordings are saved as JSON files with the following structure:

```json
{
  "version": "1.0",
  "deviceName": "HRM Belt 50246",
  "recordedAt": "2025-10-07T08:00:00.000Z",
  "duration": 4703,
  "readingsCount": 10,
  "readings": [
    {
      "timestamp": 246,
      "heartRate": 59,
      "contactDetected": true,
      "rrIntervals": [
        1016
      ]
    },
    {
      "timestamp": 743,
      "heartRate": 59,
      "contactDetected": true,
      "rrIntervals": [
        1016
      ]
    },
    // ... more readings ...
  ]
}
```

### Field Descriptions

- **deviceName**: The Bluetooth device name (e.g., "Polar H10 12345678")
- **startTime**: Unix timestamp (ms) when recording started
- **endTime**: Unix timestamp (ms) when recording stopped
- **duration**: Total recording duration in milliseconds
- **readingCount**: Total number of readings captured
- **readings**: Array of heart rate data points
  - **timestamp**: Unix timestamp (ms) when this reading was received
  - **heartRate**: BPM value (8-bit or 16-bit integer)
  - **contactDetected**: Boolean or null (sensor contact with skin)
  - **energyExpended**: Number or null (cumulative energy in kJ)
  - **rrIntervals**: Array of RR intervals in milliseconds or null

## Console API Reference

### `window.hrDebug` (Available when connected to real device)

#### `startRecording([deviceName])`
Begins capturing heart rate data from the currently connected device.

**Parameters:**
- `deviceName` (optional): Custom device name. If omitted, uses the currently connected device name.

```javascript
// Use connected device name automatically
window.hrDebug.startRecording()
// Console: 📹 Recording started for device: Polar H10 12345678

// Or specify a custom name
window.hrDebug.startRecording('My Custom Device')
// Console: 📹 Recording started for device: My Custom Device
```

#### `stopRecording()`
Stops recording and finalizes the session data.

```javascript
window.hrDebug.stopRecording()
// Console: ⏹️ Stopped recording. Captured 150 readings over 5.0 minutes
```

#### `downloadRecording()`
Downloads the current recording as a JSON file.

```javascript
window.hrDebug.downloadRecording()
// Downloads: hr-session-2024-10-05-14-30-45.json
```

### `window.hrPlayback` (Always available)

#### `start()`
Opens file picker to load a recording and starts playback.

```javascript
await window.hrPlayback.start()
// Opens file picker → loads recording → starts playback
// Console: 📊 Playback completed (when finished)
```

#### `stop()`
Stops the current playback session.

```javascript
window.hrPlayback.stop()
// Stops playback and disconnects
```

## Common Workflows

### Recording a Complete Workout

```javascript
// 1. Connect device via UI button
// 2. Start recording
window.hrDebug.startRecording()

// 3. Exercise for 30 minutes
// ... workout happens ...

// 4. Stop and save
window.hrDebug.stopRecording()
window.hrDebug.downloadRecording()

// 5. Disconnect via UI button
```

### Testing with a Previous Recording

```javascript
// 1. Make sure you're disconnected
// 2. Load and play
await window.hrPlayback.start()

// 3. Select downloaded JSON file
// 4. Watch UI update automatically
```

### Creating Multiple Test Scenarios

1. **Resting Heart Rate**: Record 5 minutes at rest (60-70 BPM)
2. **Moderate Exercise**: Record 10 minutes of walking (90-120 BPM)
3. **High Intensity**: Record 5 minutes of running (150-180 BPM)
4. **Cool Down**: Record 5 minutes of recovery (declining from 140 to 80 BPM)

Save each as separate files for different test scenarios.

## Limitations

- **Playback speed**: Fixed at 1x (real-time). Cannot speed up or slow down.
- **No pause/resume**: Playback runs continuously until finished or stopped.
- **No scrubbing**: Cannot jump to specific points in the recording.
- **Console only**: No UI controls for debug features.
- **Single file**: Can only load one recording at a time.

## Troubleshooting

### "window.hrDebug is undefined"

The `hrDebug` object is only available after the page loads. Make sure you:
1. Wait for the page to fully load
2. Check the console for any JavaScript errors

### "No recording to download"

You must call `startRecording()` and have at least one reading before downloading. The sequence is:
1. Connect device
2. `startRecording()`
3. Wait for readings (check UI shows updating BPM)
4. `stopRecording()`
5. `downloadRecording()`

### Playback doesn't start

Make sure:
1. You selected a valid JSON file (must be a recording from this app)
2. The file hasn't been corrupted or manually edited
3. You're not currently connected to a real device (disconnect first)

### Downloaded file is empty or has 0 readings

The recording only captures data between `startRecording()` and `stopRecording()` calls. Make sure:
1. You started recording before any readings came in
2. You waited for at least a few readings (check the UI updates)
3. You didn't disconnect before stopping the recording
