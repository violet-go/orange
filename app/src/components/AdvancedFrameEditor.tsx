import { Button, Slider } from '@heroui/react'

export interface FrameConfig {
  style: 'none' | 'custom'
  borderWidth: number
  borderColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
  shadowColor: string
  borderRadius: number
}

interface AdvancedFrameEditorProps {
  config: FrameConfig
  onChange: (config: FrameConfig) => void
}

export function AdvancedFrameEditor({
  config,
  onChange,
}: AdvancedFrameEditorProps) {
  const presetColors = [
    '#ffffff',
    '#000000',
    '#f3f4f6',
    '#ffc0cb',
    '#87ceeb',
    '#ffd700',
    '#ff6b6b',
    '#4ecdc4',
    '#95e1d3',
  ]

  return (
    <div className="space-y-6 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold">自定义相框</h3>

      {/* Border Width */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          边框宽度：{config.borderWidth}px
        </label>
        <Slider
          size="sm"
          step={1}
          minValue={0}
          maxValue={50}
          value={config.borderWidth}
          onChange={(value) =>
            onChange({ ...config, borderWidth: value as number })
          }
          className="max-w-full"
        />
        <div className="flex gap-2 mt-2">
          {[10, 20, 30].map((preset) => (
            <Button
              key={preset}
              size="sm"
              variant="flat"
              onPress={() => onChange({ ...config, borderWidth: preset })}
            >
              {preset}px
            </Button>
          ))}
        </div>
      </div>

      {/* Border Color */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          边框颜色
        </label>
        <div className="flex gap-2 flex-wrap">
          {presetColors.map((color) => (
            <button
              key={color}
              onClick={() => onChange({ ...config, borderColor: color })}
              className={`w-8 h-8 rounded border-2 ${
                config.borderColor === color
                  ? 'border-primary ring-2 ring-primary'
                  : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <input
          type="color"
          value={config.borderColor}
          onChange={(e) => onChange({ ...config, borderColor: e.target.value })}
          className="mt-2 w-full h-10 rounded cursor-pointer"
        />
      </div>

      {/* Shadow Blur */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          阴影模糊：{config.shadowBlur}px
        </label>
        <Slider
          size="sm"
          step={1}
          minValue={0}
          maxValue={30}
          value={config.shadowBlur}
          onChange={(value) =>
            onChange({ ...config, shadowBlur: value as number })
          }
        />
      </div>

      {/* Border Radius */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          圆角：{config.borderRadius}px
        </label>
        <Slider
          size="sm"
          step={1}
          minValue={0}
          maxValue={50}
          value={config.borderRadius}
          onChange={(value) =>
            onChange({ ...config, borderRadius: value as number })
          }
        />
      </div>

      {/* Reset Button */}
      <Button
        size="sm"
        variant="flat"
        onPress={() =>
          onChange({
            style: 'custom',
            borderWidth: 20,
            borderColor: '#ffffff',
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowOffsetY: 4,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 0,
          })
        }
      >
        重置默认
      </Button>
    </div>
  )
}
