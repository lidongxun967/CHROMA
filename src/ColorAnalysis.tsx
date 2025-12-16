import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

type Color = { r: number; g: number; b: number };

interface RoundData {
  target: Color;
  user: Color;
}

interface ColorAnalysisProps {
  history: RoundData[];
}

const ColorAnalysis: React.FC<ColorAnalysisProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa' }}>
        暂无数据，请先进行游戏提交
      </div>
    );
  }

  // Calculate average error for each channel
  const totalError = history.reduce(
    (acc, round) => ({
      r: acc.r + Math.abs(round.target.r - round.user.r),
      g: acc.g + Math.abs(round.target.g - round.user.g),
      b: acc.b + Math.abs(round.target.b - round.user.b),
    }),
    { r: 0, g: 0, b: 0 }
  );

  const count = history.length;
  const avgError = {
    r: totalError.r / count,
    g: totalError.g / count,
    b: totalError.b / count,
  };

  // Convert error to accuracy score (0-100)
  // Optimize: Use sharper curve to highlight weaknesses
  // Base 180: Any error > 180 is 0 score (stricter than 255)
  // Power 4: Rapidly decays score as error increases
  // Error 5  -> ~89 (Excellent)
  // Error 10 -> ~79 (Good)
  // Error 20 -> ~62 (Passable)
  // Error 30 -> ~48 (Weak)
  const getScore = (error: number) => {
    const normalized = Math.min(1, error / 180);
    return Math.max(0, Math.pow(1 - normalized, 4) * 100);
  };

  const data = [
    { subject: '红 (R)', score: getScore(avgError.r), fullMark: 100 },
    { subject: '绿 (G)', score: getScore(avgError.g), fullMark: 100 },
    { subject: '蓝 (B)', score: getScore(avgError.b), fullMark: 100 },
  ];

  return (
    <div className="analysis-container" style={{ width: '100%', height: '300px', marginTop: '20px' }}>
      <h3 style={{ textAlign: 'center', color: '#fff', marginBottom: '10px' }}>色彩敏感度分析</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#555" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#ddd', fontSize: 14 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="敏感度"
            dataKey="score"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.6}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '4px', color: '#fff' }}
            itemStyle={{ color: '#8884d8' }}
            formatter={(value: number | undefined) => (typeof value === 'number' ? value.toFixed(1) + '%' : '')}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#aaa', marginTop: '-10px' }}>
        基于 {count} 轮数据
      </div>
    </div>
  );
};

export default ColorAnalysis;
