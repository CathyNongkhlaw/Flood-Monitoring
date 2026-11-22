import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  BasinFloodPrediction,
  BasinRegion,
  HistoricalPredictionRecord,
} from '../types/monitoring';
import {
  MetricStripItem,
  SectionPanel,
  StatusBadge,
} from '../components/ui/OperationalPrimitives';

interface FloodPredictionPageProps {
  predictions: BasinFloodPrediction[];
  historicalPredictions: HistoricalPredictionRecord[];
  selectedRegion: BasinRegion;
}

export function FloodPredictionPage({
  predictions,
  historicalPredictions,
  selectedRegion,
}: FloodPredictionPageProps) {
  const scopedPredictions = useMemo(
    () =>
      selectedRegion === 'All Basins'
        ? predictions
        : predictions.filter((p) => p.basin === selectedRegion),
    [predictions, selectedRegion]
  );

  const [selectedBasinId, setSelectedBasinId] = useState<string>(
    scopedPredictions[0]?.id ?? predictions[0].id
  );

  const activePrediction = useMemo(
    () =>
      scopedPredictions.find((p) => p.id === selectedBasinId) ??
      scopedPredictions[0] ??
      predictions[0],
    [scopedPredictions, selectedBasinId, predictions]
  );

  const scopedHistory = useMemo(
    () =>
      selectedRegion === 'All Basins'
        ? historicalPredictions
        : historicalPredictions.filter((h) => h.basin === selectedRegion),
    [historicalPredictions, selectedRegion]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-semibold text-[#163A5F] tracking-tight">
            Flood Prediction &amp; Risk Assessment
          </h2>
          <p className="text-[12px] text-[#5C6670]">
            Machine learning flood-risk forecasts derived from measured hydrological telemetry, rainfall intensity, and drainage inspection inputs
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] bg-white border border-[#E6E2DA] px-3 py-1.5 rounded-md text-[#334155]">
          <span className="font-semibold text-[#163A5F]">Active Model:</span>
          <span className="font-mono">{activePrediction.modelVersion}</span>
        </div>
      </div>

      {/* Basin Selection Matrix */}
      <SectionPanel
        title="Basin-Level Prediction Summary"
        subtitle="Select a basin row to inspect observed vs. predicted water progression and contributing risk factors"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F4F2EE] border-b border-[#EAE6DF] text-[11px] font-semibold text-[#475569]">
                <th className="py-2 px-3">Basin</th>
                <th className="py-2 px-3">Reference Stations</th>
                <th className="py-2 px-3">Current Risk (Observed)</th>
                <th className="py-2 px-3">Predicted Risk (Model)</th>
                <th className="py-2 px-3">Forecast Period</th>
                <th className="py-2 px-3 text-right">Observed Level</th>
                <th className="py-2 px-3 text-right">Predicted Peak</th>
                <th className="py-2 px-3 text-right">Model Confidence</th>
                <th className="py-2 px-3 text-right">Generated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]">
              {scopedPredictions.map((pred) => {
                const selected = pred.id === activePrediction.id;
                return (
                  <tr
                    key={pred.id}
                    className={`transition-colors ${
                      selected ? 'bg-[#EFF6FF]' : 'hover:bg-[#F4F2EE]'
                    }`}
                  >
                    <td className="py-2 px-3 font-medium text-[#163A5F] whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedBasinId(pred.id)}
                        className="text-left text-[#0D9488] hover:underline font-semibold"
                      >
                        {pred.basin}
                      </button>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-[#475569]">
                      {pred.stationRef}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <StatusBadge label={pred.currentRisk} />
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <StatusBadge label={pred.predictedRisk} />
                    </td>
                    <td className="py-2 px-3 text-[#334155] whitespace-nowrap">
                      {pred.forecastPeriod}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-[#163A5F] whitespace-nowrap">
                      {pred.observedWaterLevelM.toFixed(2)} m
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-[#B91C1C] whitespace-nowrap">
                      {pred.predictedPeakLevelM.toFixed(2)} m
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-[#334155] whitespace-nowrap">
                      {pred.modelConfidencePct !== undefined
                        ? `${pred.modelConfidencePct}%`
                        : 'Not Provided'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-[11px] text-[#5C6670] whitespace-nowrap">
                      {pred.predictionTimestamp.replace('2026-11-20 ', '')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Selected Basin Key Metrics Strip (Distinguishing Measured vs Predicted) */}
      <div className="grid grid-cols-2 md:grid-cols-5 border border-[#E6E2DA] rounded-lg divide-y md:divide-y-0 md:divide-x divide-[#EAE6DF] bg-white">
        <MetricStripItem
          label="Selected Basin"
          value={activePrediction.basin.replace(' Basin', '')}
          subtext={activePrediction.stationRef}
        />
        <MetricStripItem
          label="Measured Water Level"
          value={activePrediction.observedWaterLevelM.toFixed(2)}
          unit="m"
          subtext={`Warning mark: ${activePrediction.warningThresholdM.toFixed(2)} m`}
        />
        <MetricStripItem
          label="Predicted Peak Level"
          value={activePrediction.predictedPeakLevelM.toFixed(2)}
          unit="m"
          subtext="Model forecast (dashed series)"
          tone={
            activePrediction.predictedRisk === 'Critical'
              ? 'critical'
              : activePrediction.predictedRisk === 'High'
                ? 'warning'
                : 'default'
          }
        />
        <MetricStripItem
          label="24h Measured Rainfall"
          value={activePrediction.rainfall24hMm.toFixed(1)}
          unit="mm"
          subtext="Catchment gauge total"
        />
        <MetricStripItem
          label="Model Confidence"
          value={
            activePrediction.modelConfidencePct !== undefined
              ? `${activePrediction.modelConfidencePct}%`
              : 'N/A'
          }
          subtext={activePrediction.forecastPeriod}
        />
      </div>

      {/* Charts + Factors Influencing Current Risk */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 space-y-4">
          <SectionPanel
            title={`Observed vs. Predicted Water-Level Progression — ${activePrediction.basin}`}
            subtitle="Solid dark line: measured IoT gauge values · Dashed red line: ML forecast trajectory"
            bodyClassName="p-4 h-[270px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={activePrediction.series}
                margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
                <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} domain={[1, 4.2]} unit="m" />
                <Tooltip
                  contentStyle={{
                    fontSize: '12px',
                    borderRadius: '2px',
                    border: '1px solid #CBD5E1',
                  }}
                />
                <ReferenceLine
                  y={activePrediction.warningThresholdM}
                  stroke="#B45309"
                  strokeDasharray="4 4"
                  label={{
                    value: `Warning (${activePrediction.warningThresholdM}m)`,
                    position: 'insideTopLeft',
                    fontSize: 10,
                    fill: '#B45309',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="observedLevelM"
                  name="Observed (Measured) Water Level (m)"
                  stroke="#163A5F"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#163A5F' }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="predictedLevelM"
                  name="Predicted (Model Output) Water Level (m)"
                  stroke="#B91C1C"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 3, fill: '#B91C1C' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </SectionPanel>

          <SectionPanel
            title="Catchment Rainfall Trend &amp; Forecast Input"
            subtitle="Hourly rainfall intensity used as meteorological input to prediction cycle (mm/hr)"
            bodyClassName="p-4 h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activePrediction.series}
                margin={{ top: 6, right: 16, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
                <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit="mm" />
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '2px' }} />
                <Bar
                  dataKey="rainfallMmHr"
                  name="Rainfall Intensity (mm/hr)"
                  fill="#14B8A6"
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </SectionPanel>
        </div>

        {/* Risk Assessment Explanation */}
        <SectionPanel
          title="Factors Influencing Current Risk"
          subtitle={`Transparent input attribution for ${activePrediction.basin} (${activePrediction.predictionTimestamp})`}
          className="xl:col-span-5"
          bodyClassName="p-4 space-y-3"
        >
          <div className="p-3 bg-[#F4F2EE] border border-[#EAE6DF] rounded-md text-[12px] text-[#334155]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#163A5F]">Current Classification</span>
              <StatusBadge label={activePrediction.currentRisk} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="font-semibold text-[#163A5F]">6-Hour Model Forecast</span>
              <StatusBadge label={activePrediction.predictedRisk} />
            </div>
            <p className="mt-2.5 text-[11px] text-[#5C6670] leading-relaxed">
              Model classifications combine observed station water levels, recent rainfall rates, and verified drainage occlusion telemetry. Predictions do not replace physical field verification or sluice engineering judgment.
            </p>
          </div>

          <div className="divide-y divide-[#EAE6DF] border border-[#EAE6DF] rounded-md">
            {activePrediction.factors.map((factor) => (
              <div key={factor.id} className="p-3 bg-white space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-[#111827]">
                    {factor.label}
                  </span>
                  <StatusBadge label={factor.impact} showIcon={false} />
                </div>
                <div className="text-[11px] text-[#5C6670] leading-snug">
                  {factor.measuredContext}
                </div>
                <div className="text-[10px] font-mono text-[#64748B]">
                  Input Domain: {factor.category}
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>

      {/* Historical Prediction Verification Table */}
      <SectionPanel
        title="Historical Prediction Results &amp; Observed Verification"
        subtitle="Audit comparison of past model outputs against subsequently measured peak levels"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F4F2EE] border-b border-[#EAE6DF] text-[11px] font-semibold text-[#475569]">
                <th className="py-2 px-3">Run ID</th>
                <th className="py-2 px-3">Prediction Timestamp</th>
                <th className="py-2 px-3">Basin</th>
                <th className="py-2 px-3">Horizon</th>
                <th className="py-2 px-3">Predicted Risk</th>
                <th className="py-2 px-3">Observed Outcome</th>
                <th className="py-2 px-3 text-right">Predicted Peak</th>
                <th className="py-2 px-3 text-right">Observed Peak</th>
                <th className="py-2 px-3 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]">
              {scopedHistory.map((row) => (
                <tr key={row.id} className="hover:bg-[#F4F2EE]">
                  <td className="py-2 px-3 font-mono font-medium text-[#163A5F]">{row.id}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-[#5C6670] whitespace-nowrap">
                    {row.timestamp}
                  </td>
                  <td className="py-2 px-3 text-[#111827]">{row.basin}</td>
                  <td className="py-2 px-3 text-[#475569]">{row.forecastWindow}</td>
                  <td className="py-2 px-3">
                    <StatusBadge label={row.predictedRisk} showIcon={false} />
                  </td>
                  <td className="py-2 px-3">
                    <StatusBadge label={row.observedOutcome} showIcon={false} />
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {row.predictedPeakM.toFixed(2)} m
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-[#163A5F]">
                    {row.observedPeakM.toFixed(2)} m
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-[#5C6670]">
                    {row.confidencePct !== undefined ? `${row.confidencePct}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  );
}
