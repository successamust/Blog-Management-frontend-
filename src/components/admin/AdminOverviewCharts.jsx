import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  Sector,
} from 'recharts';
import { Boxes, Eye } from 'lucide-react';
import AnimatedCard from '../common/AnimatedCard';
import { NexusTrendingIcon } from '../brand/NexusIcons';
import { NEXUS_CHART_COLORS, nexusTooltipProps } from '../../theme/chartTheme';

const COLORS = NEXUS_CHART_COLORS;
const ACTIVE_STROKE = 'var(--accent)';

const renderActiveSector = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke={ACTIVE_STROKE}
        strokeWidth={3}
        opacity={0.9}
      />
    </g>
  );
};

/**
 * Lazy-loaded so the admin overview shell parses without the full Recharts bundle.
 */
export default function AdminOverviewCharts({
  formatRoleLabel,
  roleData,
  statusData,
  postsByCategoryData,
  postsByMonthData,
  topPostsData,
}) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roleData.length > 0 && (
          <AnimatedCard delay={0.6}>
            <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">Roles Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) =>
                      Number(value) > 0
                        ? `${formatRoleLabel(name)}: ${(percent * 100).toFixed(0)}%`
                        : ''
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    activeShape={renderActiveSector}
                  >
                    {roleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...nexusTooltipProps} />
                  <Legend wrapperStyle={{ color: 'var(--text-primary)' }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>
        )}

        {statusData.length > 0 && (
          <AnimatedCard delay={0.7}>
            <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">Post Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) =>
                      Number(value) > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    activeShape={renderActiveSector}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...nexusTooltipProps} />
                  <Legend wrapperStyle={{ color: 'var(--text-primary)' }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {postsByCategoryData.length > 0 && (
          <AnimatedCard delay={0.8}>
            <div className="bg-gradient-to-br from-[var(--surface-bg)] to-[var(--surface-subtle)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--accent)]/15 to-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">Posts by Category</h3>
                    <p className="text-sm text-[var(--text-muted)]">Distribution across categories</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-hover)]/20 border border-[var(--accent)]/30">
                    <Boxes className="w-6 h-6 text-[var(--accent)]" />
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={postsByCategoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="categoryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#15803d" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#14532d" stopOpacity={0.72} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-subtle)' }}
                      tickLine={{ stroke: 'var(--border-subtle)' }}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-subtle)' }}
                      tickLine={{ stroke: 'var(--border-subtle)' }}
                    />
                    <Tooltip
                      {...nexusTooltipProps}
                      cursor={{ fill: 'rgba(21,128,61,0.1)', stroke: '#15803d', strokeWidth: 1 }}
                    />
                    <Bar
                      dataKey="posts"
                      fill="url(#categoryGradient)"
                      radius={[8, 8, 0, 0]}
                      stroke="#15803d"
                      strokeWidth={1}
                      activeBar={{ fill: '#4ade80', stroke: '#15803d', strokeWidth: 2 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </AnimatedCard>
        )}

        {postsByMonthData.length > 0 && (
          <AnimatedCard delay={0.9}>
            <div className="bg-gradient-to-br from-[var(--surface-bg)] to-[var(--surface-subtle)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--accent)]/18 to-teal-600/12 rounded-full blur-3xl -mr-16 -mt-16" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">Posts Over Time</h3>
                    <p className="text-sm text-[var(--text-muted)]">Last 6 months trend</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-teal-600/15 border border-[var(--accent)]/35 text-[var(--accent)]">
                    <NexusTrendingIcon className="w-6 h-6" />
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={postsByMonthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#15803d" stopOpacity={0.88} />
                        <stop offset="45%" stopColor="#0d9488" stopOpacity={0.38} />
                        <stop offset="100%" stopColor="#15803d" stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-subtle)' }}
                      tickLine={{ stroke: 'var(--border-subtle)' }}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-subtle)' }}
                      tickLine={{ stroke: 'var(--border-subtle)' }}
                    />
                    <Tooltip
                      {...nexusTooltipProps}
                      cursor={{ stroke: '#15803d', strokeWidth: 2, strokeDasharray: '5 5' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="posts"
                      stroke="#15803d"
                      strokeWidth={2.5}
                      fill="url(#timeGradient)"
                      dot={{ fill: '#0d9488', strokeWidth: 2, r: 4, stroke: '#15803d' }}
                      activeDot={{ r: 7, stroke: '#15803d', strokeWidth: 2, fill: '#4ade80' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </AnimatedCard>
        )}
      </div>

      {topPostsData.length > 0 && (
        <AnimatedCard delay={1.0}>
          <div className="bg-gradient-to-br from-[var(--surface-bg)] to-[var(--surface-subtle)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">Top 5 Posts by Views</h3>
                  <p className="text-sm text-[var(--text-muted)]">Most viewed content</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                  <Eye className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topPostsData} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="likesGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" opacity={0.3} horizontal={true} />
                  <XAxis
                    type="number"
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border-subtle)' }}
                    tickLine={{ stroke: 'var(--border-subtle)' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={180}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border-subtle)' }}
                    tickLine={{ stroke: 'var(--border-subtle)' }}
                  />
                  <Tooltip
                    {...nexusTooltipProps}
                    cursor={{ fill: 'rgba(16, 185, 129, 0.1)', stroke: '#10b981', strokeWidth: 1 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', color: 'var(--text-primary)' }} iconType="circle" />
                  <Bar
                    dataKey="views"
                    fill="url(#viewsGradient)"
                    name="Views"
                    radius={[0, 8, 8, 0]}
                    stroke="#059669"
                    strokeWidth={1}
                    activeBar={{ fill: '#34d399', stroke: '#059669', strokeWidth: 2 }}
                  />
                  <Bar
                    dataKey="likes"
                    fill="url(#likesGradient)"
                    name="Likes"
                    radius={[0, 8, 8, 0]}
                    stroke="#dc2626"
                    strokeWidth={1}
                    activeBar={{ fill: '#f87171', stroke: '#dc2626', strokeWidth: 2 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </AnimatedCard>
      )}
    </>
  );
}
