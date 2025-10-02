/**
 * ShowcaseExamples - Preset character descriptions for quick start
 * Allows users to start creating without typing
 */

interface ShowcaseExample {
  id: string
  emoji: string
  label: string
  description: string
  category: string
}

const showcaseExampleArray: ShowcaseExample[] = [
  // 可爱动物系列
  {
    id: 'cute-cat',
    emoji: '🐱',
    label: '橘猫',
    description: '一只可爱的橘猫，圆圆的大眼睛，粉色的小鼻子，戴着蓝色围巾',
    category: 'animal'
  },
  {
    id: 'cute-dog',
    emoji: '🐶',
    label: '柴犬',
    description: '一只呆萌的柴犬，竖起的耳朵，咧嘴微笑，尾巴卷曲',
    category: 'animal'
  },
  {
    id: 'cute-panda',
    emoji: '🐼',
    label: '熊猫',
    description: '一只胖嘟嘟的熊猫，黑眼圈很大，抱着竹子，圆滚滚的身体',
    category: 'animal'
  },
  {
    id: 'cute-rabbit',
    emoji: '🐰',
    label: '兔子',
    description: '一只软萌的白兔，长长的耳朵，红色的眼睛，粉色的鼻子',
    category: 'animal'
  },

  // 职业角色系列
  {
    id: 'programmer',
    emoji: '👨‍💻',
    label: '程序员',
    description: '一个可爱的程序员，戴着黑框眼镜，穿着格子衬衫，抱着笔记本电脑',
    category: 'profession'
  },
  {
    id: 'chef',
    emoji: '👨‍🍳',
    label: '厨师',
    description: '一个萌萌的厨师，戴着白色厨师帽，围着围裙，手里拿着勺子',
    category: 'profession'
  },
  {
    id: 'artist',
    emoji: '🎨',
    label: '画家',
    description: '一个艺术家，戴着贝雷帽，拿着调色板和画笔，围着围裙',
    category: 'profession'
  },

  // 幻想生物系列
  {
    id: 'dragon',
    emoji: '🐉',
    label: '小龙',
    description: '一只Q版小龙，圆圆的身体，小翅膀，大眼睛，嘴里吐着小火花',
    category: 'fantasy'
  },
  {
    id: 'unicorn',
    emoji: '🦄',
    label: '独角兽',
    description: '一只梦幻独角兽，彩虹色的鬃毛，闪亮的角，粉色的蹄子',
    category: 'fantasy'
  },

  // 食物拟人化系列
  {
    id: 'dumpling',
    emoji: '🥟',
    label: '饺子',
    description: '一个拟人化的小饺子，圆滚滚的身体，小手小脚，开心的表情',
    category: 'food'
  },
  {
    id: 'bubble-tea',
    emoji: '🧋',
    label: '奶茶',
    description: '一杯拟人化的珍珠奶茶，透明杯身，黑色珍珠，插着吸管，可爱的脸',
    category: 'food'
  },
  {
    id: 'sushi',
    emoji: '🍣',
    label: '寿司',
    description: '一个拟人化的寿司，米饭身体，三文鱼头发，海苔腰带，萌萌的表情',
    category: 'food'
  },
]

interface ShowcaseExamplesProps {
  onSelect: (description: string) => void
}

export function ShowcaseExamples({ onSelect }: ShowcaseExamplesProps) {
  return (
    <div className="showcase-section">
      <p className="showcase-label">或者试试这些创意:</p>
      <div className="showcase-grid">
        {showcaseExampleArray.map((example) => (
          <button
            key={example.id}
            onClick={() => onSelect(example.description)}
            className="showcase-card"
            title={example.description}
          >
            <span className="showcase-emoji">{example.emoji}</span>
            <span className="showcase-label-text">{example.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
