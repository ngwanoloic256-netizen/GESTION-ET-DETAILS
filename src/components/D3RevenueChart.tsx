import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AppState } from '../types';
import { formatFCFA } from '../utils';
import { BarChart3, TrendingUp, Info } from 'lucide-react';

interface D3RevenueChartProps {
  state: AppState;
}

interface MonthlyDataPoint {
  month: string;
  label: string;
  secretariat: number;
  mobileMoney: number;
  jus: number;
  total: number;
}

export default function D3RevenueChart({ state }: D3RevenueChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });
  const [chartMode, setChartMode] = useState<'monthly' | 'cumulative'>('monthly');
  
  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    label: string;
    secretariat: number;
    mobileMoney: number;
    jus: number;
    total: number;
  } | null>(null);

  // ResizeObserver for full responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      setDimensions({
        width: Math.max(width, 300),
        height: 350
      });
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Format month to French (e.g., "2026-07" -> "Jul 2026")
  const formatMonthFrench = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-');
    const months: Record<string, string> = {
      '01': 'Janv', '02': 'Févr', '03': 'Mars', '04': 'Avril',
      '05': 'Mai', '06': 'Juin', '07': 'Juil', '08': 'Août',
      '09': 'Sept', '10': 'Oct', '11': 'Nov', '12': 'Déc'
    };
    return `${months[month] || month} ${year}`;
  };

  // 1. Process data from AppState
  const getMonthKey = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length < 2) return null;
    return `${parts[0]}-${parts[1]}`; // YYYY-MM
  };

  // Calculate monthly stats
  const monthlyMap: Record<string, { secretariat: number; mobileMoney: number; jus: number }> = {};

  // Secretariat revenue (exclude stock entries)
  state.secretariatMouvements.forEach((m) => {
    if (m.typeMouvement === 'entree_stock') return;
    const key = getMonthKey(m.date);
    if (!key) return;
    if (!monthlyMap[key]) {
      monthlyMap[key] = { secretariat: 0, mobileMoney: 0, jus: 0 };
    }
    monthlyMap[key].secretariat += m.montant;
  });

  // Mobile Money volume (as revenue/flow)
  state.mobileMoneyTransactions.forEach((t) => {
    const key = getMonthKey(t.date);
    if (!key) return;
    if (!monthlyMap[key]) {
      monthlyMap[key] = { secretariat: 0, mobileMoney: 0, jus: 0 };
    }
    monthlyMap[key].mobileMoney += t.montant;
  });

  // Boissons/Jus revenue (vente)
  state.boissonsMouvements.forEach((m) => {
    if (m.typeMouvement !== 'vente') return;
    const key = getMonthKey(m.date);
    if (!key) return;
    if (!monthlyMap[key]) {
      monthlyMap[key] = { secretariat: 0, mobileMoney: 0, jus: 0 };
    }
    monthlyMap[key].jus += m.montant;
  });

  const sortedMonthKeys = Object.keys(monthlyMap).sort();

  // If empty, render placeholder
  const hasData = sortedMonthKeys.length > 0;

  // Build the list with monthly and cumulative metrics
  const processedData: {
    month: string;
    label: string;
    monthly: MonthlyDataPoint;
    cumulative: MonthlyDataPoint;
  }[] = [];

  let cumSec = 0;
  let cumMM = 0;
  let cumJus = 0;

  sortedMonthKeys.forEach((key) => {
    const val = monthlyMap[key];
    cumSec += val.secretariat;
    cumMM += val.mobileMoney;
    cumJus += val.jus;

    processedData.push({
      month: key,
      label: formatMonthFrench(key),
      monthly: {
        month: key,
        label: formatMonthFrench(key),
        secretariat: val.secretariat,
        mobileMoney: val.mobileMoney,
        jus: val.jus,
        total: val.secretariat + val.mobileMoney + val.jus,
      },
      cumulative: {
        month: key,
        label: formatMonthFrench(key),
        secretariat: cumSec,
        mobileMoney: cumMM,
        jus: cumJus,
        total: cumSec + cumMM + cumJus,
      },
    });
  });

  // Render D3 Chart
  useEffect(() => {
    if (!hasData || !svgRef.current) return;

    // Dimensions setup
    const margin = { top: 25, right: 20, bottom: 40, left: 75 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Active dataset based on mode
    const chartData = processedData.map((d) => ({
      month: d.month,
      label: d.label,
      secretariat: chartMode === 'monthly' ? d.monthly.secretariat : d.cumulative.secretariat,
      mobileMoney: chartMode === 'monthly' ? d.monthly.mobileMoney : d.cumulative.mobileMoney,
      jus: chartMode === 'monthly' ? d.monthly.jus : d.cumulative.jus,
      total: chartMode === 'monthly' ? d.monthly.total : d.cumulative.total,
    }));

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Define layers
    const stackKeys = ['secretariat', 'mobileMoney', 'jus'];
    const stack = d3.stack().keys(stackKeys);
    const series = stack(chartData as any);

    // Color Ordinal Scale
    const color = d3.scaleOrdinal<string>()
      .domain(stackKeys)
      .range(['#3b82f6', '#f59e0b', '#a855f7']); // Blue-500, Amber-500, Purple-500

    // Scales
    const x = d3.scaleBand()
      .domain(chartData.map((d) => d.label))
      .range([0, width])
      .padding(0.35);

    const yMax = d3.max(series, (s) => d3.max(s, (d) => d[1])) || 0;

    const y = d3.scaleLinear()
      .domain([0, yMax === 0 ? 1000 : yMax * 1.15])
      .nice()
      .range([height, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.05)
      .call(
        d3.axisLeft(y)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .selectAll('.tick line')
      .attr('stroke', '#475569');

    // Axes Drawing
    const xAxis = d3.axisBottom(x).tickSize(5);
    const yAxis = d3.axisLeft(y).ticks(5).tickFormat((d) => {
      const val = Number(d);
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
      return `${val}`;
    });

    // Draw X-Axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .attr('class', 'text-4xs sm:text-3xs font-semibold fill-slate-500')
      .attr('dy', '1em');

    // Draw Y-Axis
    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('class', 'text-4xs sm:text-3xs font-semibold fill-slate-500');

    // Remove domain lines for visual neatness
    g.selectAll('.domain').remove();
    g.selectAll('.tick line').attr('stroke', '#cbd5e1');

    // Draw Layers and Bars
    const layers = g.selectAll('g.layer')
      .data(series)
      .enter()
      .append('g')
      .attr('class', 'layer')
      .attr('fill', (d) => color(d.key) as string);

    const bars = layers.selectAll('rect')
      .data((d) => d)
      .enter()
      .append('rect')
      .attr('x', (d: any) => x(d.data.label) || 0)
      .attr('y', height) // Start height for entry animation
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('cursor', 'pointer');

    // Add entry animation
    bars.transition()
      .duration(850)
      .delay((_d, i) => i * 40)
      .ease(d3.easeCubicOut)
      .attr('y', (d) => y(d[1]))
      .attr('height', (d) => y(d[0]) - y(d[1]));

    // Interactive Hover Events
    bars
      .on('mouseover', function (event, d: any) {
        const [mouseX, mouseY] = d3.pointer(event, containerRef.current);

        setTooltip({
          show: true,
          x: mouseX,
          y: mouseY - 15,
          label: d.data.label,
          secretariat: d.data.secretariat,
          mobileMoney: d.data.mobileMoney,
          jus: d.data.jus,
          total: d.data.total,
        });

        // Dim other bars
        g.selectAll('rect').attr('opacity', 0.5);
        d3.select(event.currentTarget).attr('opacity', 1);
      })
      .on('mousemove', function (event) {
        const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
        setTooltip((prev) => prev ? { ...prev, x: mouseX, y: mouseY - 15 } : null);
      })
      .on('mouseleave', function () {
        setTooltip(null);
        g.selectAll('rect').attr('opacity', 1);
      });

  }, [dimensions, chartMode, hasData]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
      {/* Header with Mode Selection */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2 border-b border-slate-50">
        <div>
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-500" />
            Évolution du Chiffre d'Affaires (D3.js)
          </h3>
          <p className="text-2xs text-slate-400 font-normal">
            Visualisation graphique de l'activité commerciale mensuelle par catégorie
          </p>
        </div>

        {/* Mode Toggle Switch */}
        {hasData && (
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit self-start sm:self-auto">
            <button
              onClick={() => setChartMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
                chartMode === 'monthly'
                  ? 'bg-white text-slate-800 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Vue Mensuelle
            </button>
            <button
              onClick={() => setChartMode('cumulative')}
              className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                chartMode === 'cumulative'
                  ? 'bg-white text-slate-800 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp size={11} />
              CA Cumulé
            </button>
          </div>
        )}
      </div>

      {/* Main Graph Canvas */}
      <div ref={containerRef} className="relative w-full overflow-hidden min-h-[350px]">
        {!hasData ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Info size={32} className="text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-500">Pas assez de données de transactions</p>
            <p className="text-3xs text-slate-400 mt-1 max-w-[260px]">
              Enregistrez des ventes ou des opérations dans les modules Secrétariat, Mobile Money ou Boissons pour alimenter ce graphique.
            </p>
          </div>
        ) : (
          <>
            <svg
              ref={svgRef}
              width={dimensions.width}
              height={dimensions.height}
              className="mx-auto block"
            />

            {/* Custom Interactive HTML Tooltip inside React */}
            {tooltip && tooltip.show && (
              <div
                className="absolute z-10 bg-slate-900/95 text-white p-3 rounded-xl border border-slate-800 shadow-lg pointer-events-none text-3xs font-medium space-y-1.5 backdrop-blur-xs transition-all duration-75"
                style={{
                  left: `${tooltip.x + 12}px`,
                  top: `${tooltip.y - 12}px`,
                  transform: 'translate(-10%, -100%)',
                }}
              >
                <div className="font-bold border-b border-slate-800 pb-1 text-2xs text-slate-200 uppercase tracking-wide">
                  {tooltip.label}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Secrétariat :
                    </span>
                    <span className="font-semibold text-right">{formatFCFA(tooltip.secretariat)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Mobile Money :
                    </span>
                    <span className="font-semibold text-right">{formatFCFA(tooltip.mobileMoney)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Boissons / Jus :
                    </span>
                    <span className="font-semibold text-right">{formatFCFA(tooltip.jus)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800 pt-1.5 font-bold text-2xs text-emerald-400">
                  <span>TOTAL :</span>
                  <span>{formatFCFA(tooltip.total)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modern Horizontal Legend */}
      {hasData && (
        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 pt-2 border-t border-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-2xs" />
            <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider">Secrétariat</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs" />
            <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider">Mobile Money</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-2xs" />
            <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider">Boissons (Jus)</span>
          </div>
        </div>
      )}
    </div>
  );
}
