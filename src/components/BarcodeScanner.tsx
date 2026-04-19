'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, AlertCircle, Camera } from 'lucide-react'
import { BarcodeProductResult } from '@/app/api/inventory/barcode/route'

interface Props {
  onResult: (product: BarcodeProductResult) => void
  onClose: () => void
}

type ScanState = 'starting' | 'scanning' | 'found' | 'not_found' | 'error' | 'no_camera'

const SCANNER_ID = 'hh-barcode-scanner'

export default function BarcodeScanner({ onResult, onClose }: Props) {
  const [state, setState] = useState<ScanState>('starting')
  const [message, setMessage] = useState('')
  const [product, setProduct] = useState<BarcodeProductResult | null>(null)
  const scannerRef = useRef<any>(null)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    let scanner: any = null

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        scanner = new Html5Qrcode(SCANNER_ID)
        scannerRef.current = scanner

        const devices = await Html5Qrcode.getCameras()
        if (!devices || devices.length === 0) {
          setState('no_camera')
          return
        }

        // Prefer rear/environment camera
        const rear = devices.find(d =>
          /back|rear|environment/i.test(d.label)
        ) ?? devices[devices.length - 1]

        await scanner.start(
          rear.id,
          { fps: 10, qrbox: { width: 280, height: 160 } },
          async (decodedText: string) => {
            // Pause scanning immediately
            try { await scanner.pause(true) } catch { /* ignore */ }

            setState('found')
            setMessage(`條碼：${decodedText}，正在查詢...`)

            const res = await fetch(`/api/inventory/barcode?code=${encodeURIComponent(decodedText)}`)
            const data: BarcodeProductResult = await res.json()
            setProduct(data)

            if (data.found) {
              setMessage(data.name ? `找到：${data.name}` : '找到產品資料')
            } else {
              setState('not_found')
              setMessage(`條碼 ${decodedText} 未能在資料庫找到，可手動輸入`)
            }
          },
          undefined  // error callback — suppress per-frame errors
        )

        setState('scanning')
      } catch (err: any) {
        if (err?.message?.includes('camera') || err?.name === 'NotAllowedError') {
          setState('no_camera')
        } else {
          setState('error')
          setMessage(err?.message || '未能啟動鏡頭')
        }
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [])

  const handleAccept = () => {
    if (product) onResult(product)
  }

  const handleRescan = async () => {
    setProduct(null)
    setState('scanning')
    setMessage('')
    try { await scannerRef.current?.resume() } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-gray-900">掃描條碼</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera view */}
        <div className="relative bg-black">
          {/* html5-qrcode mounts here */}
          <div
            id={SCANNER_ID}
            className="w-full"
            style={{ minHeight: 240 }}
          />

          {/* Scanning overlay guide */}
          {state === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-indigo-400 rounded-lg opacity-70"
                style={{ width: 280, height: 160 }}
              >
                {/* corner marks */}
                {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map(pos => (
                  <div key={pos} className={`absolute ${pos} w-5 h-5 border-indigo-400 border-2`}
                    style={{
                      borderRight: pos.includes('left') ? 'none' : undefined,
                      borderLeft: pos.includes('right') ? 'none' : undefined,
                      borderBottom: pos.includes('top') ? 'none' : undefined,
                      borderTop: pos.includes('bottom') ? 'none' : undefined,
                    }}
                  />
                ))}
              </div>
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">
                  將條碼對準框內
                </span>
              </div>
            </div>
          )}

          {/* States overlay */}
          {state === 'starting' && (
            <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-white text-sm">正在啟動鏡頭...</p>
            </div>
          )}

          {state === 'no_camera' && (
            <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <p className="text-white text-sm">無法存取鏡頭</p>
              <p className="text-gray-400 text-xs">請確認已授權使用鏡頭，或在設定中開啟鏡頭權限</p>
            </div>
          )}

          {state === 'error' && (
            <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-white text-sm">{message || '發生錯誤'}</p>
            </div>
          )}
        </div>

        {/* Status / Result area */}
        <div className="px-5 py-4 space-y-3">
          {/* Scanning hint */}
          {state === 'scanning' && (
            <p className="text-sm text-gray-500 text-center">
              對準商品上的 EAN / UPC 條碼
            </p>
          )}

          {/* Looking up */}
          {state === 'found' && !product && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              {message}
            </div>
          )}

          {/* Product found */}
          {product?.found && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-1">
              {product.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt="" className="h-16 object-contain mx-auto mb-2" />
              )}
              <p className="text-sm font-semibold text-indigo-900">{product.name || '(未有名稱)'}</p>
              {product.brand && <p className="text-xs text-indigo-700">品牌：{product.brand}</p>}
              {product.quantity_str && <p className="text-xs text-indigo-600">份量：{product.quantity_str}</p>}
              <p className="text-xs text-gray-400">條碼：{product.barcode}</p>
            </div>
          )}

          {/* Not found */}
          {state === 'not_found' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              <p className="font-medium mb-0.5">資料庫未有此產品</p>
              <p className="text-xs text-amber-600">{message}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {(state === 'found' && product) || state === 'not_found' ? (
              <>
                <button
                  onClick={handleRescan}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  重新掃描
                </button>
                {product?.found ? (
                  <button
                    onClick={handleAccept}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    使用此資料
                  </button>
                ) : (
                  <button
                    onClick={() => onResult({ found: false, barcode: product?.barcode ?? '' })}
                    className="flex-1 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                  >
                    手動輸入
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
