// 'use client'
// import { useState } from 'react'
// import { supabase } from '@/lib/supabase'

// export default function ConnectionTest() {
//   const [testing, setTesting] = useState(false)
//   const [result, setResult] = useState<string | null>(null)

//   const testConnection = async () => {
//     setTesting(true)
//     setResult(null)

//     try {
//       // Test basic connection
//       console.log('🔍 Testing Supabase connection...')
//       console.log('🔑 Using URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
//       console.log('🔑 API Key (first 20 chars):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
      
//       const start = Date.now()
//       const { data, error, status, statusText } = await supabase
//         .from('groups')
//         .select('count')
//         .limit(1)
      
//       const duration = Date.now() - start
      
//       console.log('📡 Full response:', { data, error, status, statusText })
      
//       if (error) {
//         if (error.message?.includes('Invalid API key')) {
//           setResult(`❌ Invalid API Key: Check your .env.local file`)
//         } else if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
//           setResult(`❌ Table Missing: Run the database migration`)
//         } else if (error.message?.includes('permission denied')) {
//           setResult(`❌ Permission Denied: Set up RLS policies`)
//         } else {
//           setResult(`❌ Supabase Error: ${error.message || error.details || 'Unknown error'}`)
//         }
//       } else {
//         setResult(`✅ Connection successful (${duration}ms)`)
//       }
//     } catch (err: any) {
//       console.log('Network error:', err)
//       if (err?.message?.includes('fetch')) {
//         setResult(`❌ Network Error: Check internet connection`)
//       } else {
//         setResult(`❌ Network Error: ${err?.message || err?.toString() || 'Unknown error'}`)
//       }
//     } finally {
//       setTesting(false)
//     }
//   }

//   const checkEnvVars = () => {
//     const url = process.env.NEXT_PUBLIC_SUPABASE_URL
//     const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
//     if (!url || !key) {
//       setResult(`❌ Missing environment variables`)
//       return false
//     }
    
//     if (!url.includes('supabase.co')) {
//       setResult(`❌ Invalid Supabase URL format`)
//       return false
//     }
    
//     if (!key.startsWith('eyJ')) {
//       setResult(`❌ Invalid API key format`)
//       return false
//     }
    
//     setResult(`✅ Environment variables look correct`)
//     return true
//   }

//   return (
//     <div className="bg-white/5 rounded-lg p-4 space-y-3">
//       <div className="flex items-center justify-between">
//         <h3 className="text-sm font-semibold">Supabase Diagnostics</h3>
//         <div className="space-x-2">
//           <button
//             onClick={checkEnvVars}
//             className="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded"
//           >
//             Check Env
//           </button>
//           <button
//             onClick={testConnection}
//             disabled={testing}
//             className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1 rounded transition-all"
//           >
//             {testing ? 'Testing...' : 'Test DB'}
//           </button>
//         </div>
//       </div>
//       {result && (
//         <p className={`text-xs ${result.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
//           {result}
//         </p>
//       )}
//     </div>
//   )
// }
// }