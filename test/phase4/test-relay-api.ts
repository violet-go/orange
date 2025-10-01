/**
 * 测试中转聚合平台是否支持 Gemini API 格式
 *
 * 平台: https://api.zetatechs.online
 * Key: sk-0jscjMBRrMjEZoaULtQdeoi1HglQtD3vaGQ8Af5isu0an78G
 */

const RELAY_BASE_URL = 'https://api.zetatechs.online'
const RELAY_API_KEY = 'sk-0jscjMBRrMjEZoaULtQdeoi1HglQtD3vaGQ8Af5isu0an78G'

async function testRelayAPI() {
  console.log('🧪 测试中转平台 Gemini API 调用')
  console.log('================================================')
  console.log(`Base URL: ${RELAY_BASE_URL}`)
  console.log(`API Key: ${RELAY_API_KEY.slice(0, 10)}...${RELAY_API_KEY.slice(-6)}`)
  console.log('')

  // 测试 1: Gemini 标准格式
  console.log('📋 Test 1: Gemini 标准格式')
  console.log('Endpoint: /v1beta/models/gemini-2.5-flash-image-preview:generateContent')

  const geminiEndpoint = `${RELAY_BASE_URL}/v1beta/models/gemini-2.5-flash-image-preview:generateContent`

  try {
    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': RELAY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'a simple red apple on white background' }
          ]
        }]
      })
    })

    console.log(`Status: ${response.status} ${response.statusText}`)
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log(`Response length: ${responseText.length} bytes`)

    if (response.ok) {
      const data = JSON.parse(responseText)
      console.log('✅ 成功！响应结构:')
      console.log(`  - candidates: ${data.candidates?.length || 0}`)

      if (data.candidates?.[0]?.content?.parts) {
        const parts = data.candidates[0].content.parts
        console.log(`  - parts: ${parts.length}`)

        const imagePart = parts.find((p: any) => p.inlineData)
        if (imagePart) {
          console.log(`  - inlineData found: ${imagePart.inlineData.mimeType}`)
          console.log(`  - base64 length: ${imagePart.inlineData.data.length} chars`)

          // 验证是否是有效的 base64 PNG
          const buffer = Buffer.from(imagePart.inlineData.data, 'base64')
          const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
          console.log(`  - Valid PNG: ${isPNG ? '✅' : '❌'}`)
          console.log(`  - Image size: ${buffer.length} bytes`)
        } else {
          console.log('  - ❌ No inlineData found')
        }
      }

      console.log('')
      console.log('🎉 中转平台支持 Gemini 格式！')
      return true

    } else {
      console.log('❌ 请求失败')
      console.log('Response body:', responseText.slice(0, 500))
      return false
    }

  } catch (error) {
    console.log('❌ 网络错误:', error)
    return false
  }
}

// 测试 2: 尝试其他可能的端点格式
async function testAlternativeEndpoints() {
  console.log('')
  console.log('📋 Test 2: 尝试其他可能的端点')
  console.log('================================================')

  const endpoints = [
    '/v1/models/gemini-2.5-flash-image-preview:generateContent',
    '/gemini/v1beta/models/gemini-2.5-flash-image-preview:generateContent',
    '/v1beta/generateContent',
  ]

  for (const endpoint of endpoints) {
    console.log(`\nTrying: ${endpoint}`)

    try {
      const response = await fetch(`${RELAY_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'x-goog-api-key': RELAY_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'test' }]
          }]
        })
      })

      console.log(`  Status: ${response.status}`)

      if (response.ok) {
        console.log('  ✅ 这个端点可用！')
        return endpoint
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error}`)
    }
  }

  return null
}

// 测试 3: 检查是否需要不同的 API Key header
async function testDifferentAuthHeaders() {
  console.log('')
  console.log('📋 Test 3: 测试不同的认证 header')
  console.log('================================================')

  const authHeaders = [
    { name: 'x-goog-api-key', value: RELAY_API_KEY },
    { name: 'Authorization', value: `Bearer ${RELAY_API_KEY}` },
    { name: 'api-key', value: RELAY_API_KEY },
    { name: 'x-api-key', value: RELAY_API_KEY },
  ]

  const endpoint = `${RELAY_BASE_URL}/v1beta/models/gemini-2.5-flash-image-preview:generateContent`

  for (const auth of authHeaders) {
    console.log(`\nTrying: ${auth.name}`)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          [auth.name]: auth.value,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'test' }]
          }]
        })
      })

      console.log(`  Status: ${response.status}`)

      if (response.ok) {
        console.log('  ✅ 这个 header 可用！')
        return auth.name
      } else {
        const text = await response.text()
        console.log(`  Response: ${text.slice(0, 100)}`)
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error}`)
    }
  }

  return null
}

// 运行所有测试
async function main() {
  console.log('')
  console.log('🚀 开始测试中转平台')
  console.log('================================================')
  console.log('')

  const success = await testRelayAPI()

  if (!success) {
    console.log('')
    console.log('❌ 标准格式失败，尝试其他方式...')

    await testAlternativeEndpoints()
    await testDifferentAuthHeaders()

    console.log('')
    console.log('================================================')
    console.log('⚠️  中转平台可能不支持 Gemini 格式')
    console.log('请联系平台提供商确认:')
    console.log('  1. 是否支持 gemini-2.5-flash-image-preview')
    console.log('  2. 正确的 endpoint 路径')
    console.log('  3. 正确的认证 header 名称')
  } else {
    console.log('')
    console.log('================================================')
    console.log('✅ 测试完成！中转平台支持 Gemini API')
  }
}

main().catch(console.error)
