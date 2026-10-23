import {Box, LinearProgress, Stack, Tooltip, Typography} from '@mui/material';
import type {CellKind} from '../core/assembler';
import {ramUsage} from '../core/ramUsage';

/** Occupied addresses / total installed RAM, shared across 8/16/32/64-address modes. */
export default function RamUsageMeter({kinds}:{kinds:readonly CellKind[]}) {
  const usage=ramUsage(kinds);
  const color = usage.severity === 'error' ? '#d64545' : usage.severity === 'warning' ? '#e6a325' : '#23985d';
  return <Tooltip title={`${usage.used} of ${usage.capacity} memory addresses occupied (including DAT 0)`}>
    <Box className="ram-usage-meter" role="group" aria-label={`RAM used: ${usage.percent}%`}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
        <Typography className="ram-usage-caption">RAM USED</Typography>
        <Typography className="ram-usage-percent" sx={{color}}>{usage.percent}%</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={usage.percent} aria-label="RAM usage" sx={{height:7,borderRadius:8,bgcolor:'#cddde6','& .MuiLinearProgress-bar':{backgroundColor:color,borderRadius:8,transition:'transform 240ms ease'}}}/>
    </Box>
  </Tooltip>;
}
