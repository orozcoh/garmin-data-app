import FitParser from 'fit-file-parser';

export interface FitRecord {
  timestamp?: number;
  heart_rate?: number;
  speed?: number;
  altitude?: number;
  power?: number;
  cadence?: number;
  temperature?: number;
  left_power?: number;
  right_power?: number;
}

interface Config {
  ftp?: number;
  hrmax?: number;
  weight?: number;
}

interface DeviceInfo {
  manufacturer?: string;
  model?: string;
  power_meter_model?: string;
  recording_interval?: number;
  gps_enabled?: boolean;
}

interface SessionSummary {
  date?: string;
  start_time?: string;
  total_timer_time?: number;
  total_elapsed_time?: number;
  moving_time?: number;
  distance_m?: number;
  total_work_kj?: number;
  total_calories?: number;
  avg_speed?: number;
  max_speed?: number;
  avg_power?: number;
  max_power?: number;
  normalized_power?: number;
  intensity_factor?: number;
  training_stress_score?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_cadence?: number;
  max_cadence?: number;
  elevation_gain?: number;
  elevation_loss?: number;
  avg_temperature?: number;
  max_temperature?: number;
}

interface EnvInfo {
  temperature_avg?: number;
  temperature_max?: number;
  humidity?: number;
  altitude_avg?: number;
  altitude_max?: number;
}

interface PowerZones {
  z1_time_sec: number;
  z2_time_sec: number;
  z3_time_sec: number;
  z4_time_sec: number;
  z5_time_sec: number;
  z6_time_sec: number;
  z7_time_sec: number;
}

interface HrZones {
  hr_z1_time: number;
  hr_z2_time: number;
  hr_z3_time: number;
  hr_z4_time: number;
  hr_z5_time: number;
}

interface PowerProfile {
  best_5s: number;
  best_15s: number;
  best_30s: number;
  best_1min: number;
  best_5min: number;
  best_10min: number;
  best_20min: number;
  best_30min: number;
  best_60min: number;
  watts_per_kg_best_5min?: number;
  watts_per_kg_best_20min?: number;
}

interface Decoupling {
  hr_power_drift_percentage: number;
  first_half_avg_power: number;
  second_half_avg_power: number;
  first_half_avg_hr: number;
  second_half_avg_hr: number;
}

interface Efficiency {
  efficiency_factor: number;
  variability_index: number;
  power_hr_ratio: number;
  cadence_power_correlation: number;
  left_right_balance?: number;
}

export interface ParseResult {
  device: DeviceInfo;
  session: SessionSummary;
  env: EnvInfo;
  powerZones: PowerZones;
  hrZones: HrZones;
  powerProfile: PowerProfile;
  decoupling: Decoupling;
  efficiency: Efficiency;
  raw: {
    records: FitRecord[];
    sessions: any[];
    devices: any[];
  };
}

// Cached parser
const fitParser = new FitParser({
  force: true,
  speedUnit: 'km/h',
  lengthUnit: 'km',
  temperatureUnit: 'celsius',
});

// Helpers
function computeBestAverage(values: number[], times: number[], targetDuration: number): number {
  let maxAvg = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < Math.min(i + 300, values.length); j++) {
      const duration = times[j - 1] - times[i];
      if (duration >= targetDuration * 0.95 && duration <= targetDuration * 1.05) {
        const sum = values.slice(i, j).reduce((a, b) => a + b, 0);
        const avg = sum / (j - i);
        if (avg > maxAvg) maxAvg = avg;
      }
    }
  }
  return maxAvg;
}

function computeNormalizedPower(timeSeries: {time: number, power: number}[]): number {
  const powers4: number[] = [];
  for (let i = 0; i < timeSeries.length; i++) {
    const endTime = timeSeries[i].time;
    let startIdx = -1;
    for (let k = i; k >= 0; k--) {
      if (timeSeries[k].time <= endTime - 30) {
        startIdx = k;
        break;
      }
    }
    if (startIdx !== -1) {
      const windowPowers = timeSeries.slice(startIdx, i + 1).map(t => Math.pow(Math.max(t.power, 0), 4));
      const avg4 = windowPowers.reduce((a, b) => a + b, 0) / windowPowers.length;
      powers4.push(avg4);
    }
  }
  if (powers4.length === 0) return 0;
  const mean4 = powers4.reduce((a, b) => a + b, 0) / powers4.length;
  return Math.pow(mean4, 0.25);
}

function computeCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const num = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
  const den1 = Math.sqrt(x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0));
  const den2 = Math.sqrt(y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0));
  return den1 * den2 === 0 ? 0 : num / (den1 * den2);
}

export async function parseFitFile(arrayBuffer: ArrayBuffer, config: Config = {}): Promise<ParseResult> {
  const rawData: any = await new Promise((resolve, reject) => {
    fitParser.parse(arrayBuffer, (err, data) => {
      if (err) {
        reject(new Error(`FIT parse error: ${err}`));
        return;
      }
      resolve(data);
    });
  });

  const records: FitRecord[] = rawData.records || [];
  const sortedRecords = records.filter((r: FitRecord) => r.timestamp).sort((a: FitRecord, b: FitRecord) => (a.timestamp! - b.timestamp!) );

  const sessionRaw = rawData.sessions?.[0] || rawData.activities?.[0] || {};
  const deviceRaw = rawData.devices?.[0] || {};
  const fileId = rawData.file_id || {};

  // Device
  const device: DeviceInfo = {
    manufacturer: deviceRaw.manufacturer,
    model: deviceRaw.product_name || deviceRaw.model,
    power_meter_model: deviceRaw.product_name_power, // approximate
    recording_interval: fileId.recording_interval_ms ? fileId.recording_interval_ms / 1000 : undefined,
    gps_enabled: !!fileId.gps,
  };

  // Session
  const startDate = sessionRaw.start_time ? new Date(sessionRaw.start_time * 1000) : undefined;
  const session: SessionSummary = {
    date: startDate?.toISOString().slice(0, 10),
    start_time: startDate?.toLocaleTimeString(),
    total_timer_time: sessionRaw.total_timer_time,
    total_elapsed_time: sessionRaw.total_elapsed_time,
    moving_time: sessionRaw.total_timer_time, // approximation
    distance_m: sessionRaw.total_distance ? sessionRaw.total_distance * 1000 : undefined,
    total_work_kj: sessionRaw.total_work ? sessionRaw.total_work / 1000 : undefined,
    total_calories: sessionRaw.total_calories,
    avg_speed: sessionRaw.avg_speed,
    max_speed: sessionRaw.max_speed,
    avg_power: sessionRaw.avg_power,
    max_power: sessionRaw.max_power,
    avg_heart_rate: sessionRaw.avg_heart_rate,
    max_heart_rate: sessionRaw.max_heart_rate,
    avg_cadence: sessionRaw.avg_cadence,
    max_cadence: sessionRaw.max_cadence,
    elevation_gain: sessionRaw.total_ascent,
    elevation_loss: sessionRaw.total_descent,
    avg_temperature: sessionRaw.avg_temperature,
    max_temperature: sessionRaw.max_temperature,
  };

  // Env
  const env: EnvInfo = {
    temperature_avg: session.avg_temperature,
    temperature_max: session.max_temperature,
    humidity: sessionRaw.avg_relative_humidity,
    altitude_avg: sortedRecords.length ? sortedRecords.reduce((sum, r) => sum + (r.altitude || 0), 0) / sortedRecords.length : undefined,
    altitude_max: sortedRecords.length ? Math.max(...sortedRecords.map(r => r.altitude || 0)) : undefined,
  };

  // Time series
  if (sortedRecords.length > 0) {
    const baseTime = sortedRecords[0].timestamp!;
    const timeSeries: { time: number; power: number; hr: number; cadence: number; temp: number; alt: number; left_power?: number; right_power?: number }[] = sortedRecords.map(r => ({
      time: (r.timestamp! - baseTime) / 1000,
      power: r.power || 0,
      hr: r.heart_rate || 0,
      cadence: r.cadence || 0,
      temp: r.temperature || 0,
      alt: r.altitude || 0,
      left_power: r.left_power,
      right_power: r.right_power,
    }));

    const totalDuration = timeSeries[timeSeries.length - 1].time;
    const avgPower = timeSeries.reduce((sum, t) => sum + t.power, 0) / timeSeries.length;
    const avgHr = timeSeries.reduce((sum, t) => sum + t.hr, 0) / timeSeries.length;
    const avgCadence = timeSeries.reduce((sum, t) => sum + t.cadence, 0) / timeSeries.length;

    // Fill missing avgs
    if (!session.avg_power) session.avg_power = avgPower;
    if (!session.avg_heart_rate) session.avg_heart_rate = avgHr;
    if (!session.avg_cadence) session.avg_cadence = avgCadence;

    // Normalized Power
    const np = computeNormalizedPower(timeSeries);
    session.normalized_power = np;

    // TSS, IF
    if (config.ftp && np > 0) {
      const iF = np / config.ftp;
      session.intensity_factor = iF;
      session.training_stress_score = (totalDuration / 60 * iF ** 2 * 100) / 36;
    }

    // Power Profile
    const powerTimes = timeSeries.map(t => t.time);
    const powerValues = timeSeries.map(t => t.power);
    const powerProfile: PowerProfile = {
      best_5s: computeBestAverage(powerValues, powerTimes, 5),
      best_15s: computeBestAverage(powerValues, powerTimes, 15),
      best_30s: computeBestAverage(powerValues, powerTimes, 30),
      best_1min: computeBestAverage(powerValues, powerTimes, 60),
      best_5min: computeBestAverage(powerValues, powerTimes, 300),
      best_10min: computeBestAverage(powerValues, powerTimes, 600),
      best_20min: computeBestAverage(powerValues, powerTimes, 1200),
      best_30min: computeBestAverage(powerValues, powerTimes, 1800),
      best_60min: computeBestAverage(powerValues, powerTimes, 3600),
    };
    if (config.weight) {
      powerProfile.watts_per_kg_best_5min = powerProfile.best_5min / config.weight;
      powerProfile.watts_per_kg_best_20min = powerProfile.best_20min / config.weight;
    }

    // Zones
    const powerZones: PowerZones = { z1_time_sec: 0, z2_time_sec: 0, z3_time_sec: 0, z4_time_sec: 0, z5_time_sec: 0, z6_time_sec: 0, z7_time_sec: 0 };
    if (config.ftp) {
      const boundaries = [0.55, 0.75, 0.90, 1.05, 1.20, 1.50, Infinity];
      const zoneTimes = new Array(7).fill(0);
      for (let i = 0; i < timeSeries.length - 1; i++) {
        const p = timeSeries[i].power / config.ftp;
        let zoneIdx = 0;
        for (let k = 0; k < boundaries.length; k++) {
          if (p <= boundaries[k]) {
            zoneIdx = k;
            break;
          }
        }
        zoneTimes[zoneIdx] += timeSeries[i + 1].time - timeSeries[i].time;
      }
      powerZones.z1_time_sec = zoneTimes[0];
      powerZones.z2_time_sec = zoneTimes[1];
      powerZones.z3_time_sec = zoneTimes[2];
      powerZones.z4_time_sec = zoneTimes[3];
      powerZones.z5_time_sec = zoneTimes[4];
      powerZones.z6_time_sec = zoneTimes[5];
      powerZones.z7_time_sec = zoneTimes[6];
    }

    const hrZones: HrZones = { hr_z1_time: 0, hr_z2_time: 0, hr_z3_time: 0, hr_z4_time: 0, hr_z5_time: 0 };
    if (config.hrmax) {
      const boundaries = [0.68, 0.83, 0.94, 1.05, Infinity];
      const zoneTimes = new Array(5).fill(0);
      for (let i = 0; i < timeSeries.length - 1; i++) {
        const h = timeSeries[i].hr / config.hrmax;
        let zoneIdx = 0;
        for (let k = 0; k < boundaries.length; k++) {
          if (h <= boundaries[k]) {
            zoneIdx = k;
            break;
          }
        }
        zoneTimes[zoneIdx] += timeSeries[i + 1].time - timeSeries[i].time;
      }
      hrZones.hr_z1_time = zoneTimes[0];
      hrZones.hr_z2_time = zoneTimes[1];
      hrZones.hr_z3_time = zoneTimes[2];
      hrZones.hr_z4_time = zoneTimes[3];
      hrZones.hr_z5_time = zoneTimes[4];
    }

    // Decoupling
    const medianTime = totalDuration / 2;
    const firstHalf = timeSeries.filter(t => t.time < medianTime);
    const secondHalf = timeSeries.filter(t => t.time >= medianTime);
    const firstHalfAvgPower = firstHalf.reduce((sum, t) => sum + t.power, 0) / firstHalf.length || 0;
    const secondHalfAvgPower = secondHalf.reduce((sum, t) => sum + t.power, 0) / secondHalf.length || 0;
    const firstHalfAvgHr = firstHalf.reduce((sum, t) => sum + t.hr, 0) / firstHalf.length || 0;
    const secondHalfAvgHr = secondHalf.reduce((sum, t) => sum + t.hr, 0) / secondHalf.length || 0;
    const hrPowerDriftPercentage = firstHalfAvgHr > 0 ? ((secondHalfAvgHr / firstHalfAvgHr) - 1) * 100 : 0;

    const decoupling: Decoupling = {
      hr_power_drift_percentage: hrPowerDriftPercentage,
      first_half_avg_power: firstHalfAvgPower,
      second_half_avg_power: secondHalfAvgPower,
      first_half_avg_hr: firstHalfAvgHr,
      second_half_avg_hr: secondHalfAvgHr,
    };

    // Efficiency
    const ef = avgHr > 0 ? np / avgHr : 0;
    const vi = avgPower > 0 ? np / avgPower : 0;
    const powerHrRatio = avgHr > 0 ? avgPower / avgHr : 0;
    const cadencePowerCorr = computeCorrelation(timeSeries.map(t => t.cadence), timeSeries.map(t => t.power));
    let leftRightBalance: number | undefined;
    const balanceData = timeSeries.filter(t => t.left_power !== undefined && t.right_power !== undefined && (t.left_power! + t.right_power!) > 0);
    if (balanceData.length > 0) {
      const avgBalance = balanceData.reduce((sum, t) => sum + (t.left_power! / (t.left_power! + t.right_power!) * 100), 0) / balanceData.length;
      leftRightBalance = avgBalance;
    }

    const efficiency: Efficiency = {
      efficiency_factor: ef,
      variability_index: vi,
      power_hr_ratio: powerHrRatio,
      cadence_power_correlation: cadencePowerCorr,
      left_right_balance: leftRightBalance,
    };

    return {
      device,
      session,
      env,
      powerZones,
      hrZones,
      powerProfile,
      decoupling,
      efficiency,
      raw: {
        records: sortedRecords,
        sessions: rawData.sessions || [],
        devices: rawData.devices || [],
      },
    };
  }

  // No records fallback
  return {
    device,
    session,
    env,
    powerZones: { z1_time_sec: 0, z2_time_sec: 0, z3_time_sec: 0, z4_time_sec: 0, z5_time_sec: 0, z6_time_sec: 0, z7_time_sec: 0 },
    hrZones: { hr_z1_time: 0, hr_z2_time: 0, hr_z3_time: 0, hr_z4_time: 0, hr_z5_time: 0 },
    powerProfile: { best_5s: 0, best_15s: 0, best_30s: 0, best_1min: 0, best_5min: 0, best_10min: 0, best_20min: 0, best_30min: 0, best_60min: 0 },
    decoupling: { hr_power_drift_percentage: 0, first_half_avg_power: 0, second_half_avg_power: 0, first_half_avg_hr: 0, second_half_avg_hr: 0 },
    efficiency: { efficiency_factor: 0, variability_index: 0, power_hr_ratio: 0, cadence_power_correlation: 0 },
    raw: {
      records: [],
      sessions: rawData.sessions || [],
      devices: rawData.devices || [],
    },
  };
}