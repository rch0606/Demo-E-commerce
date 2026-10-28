'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileText, ChevronDown } from 'lucide-react'
import { downloadCSV, downloadPDF, OrderData, OrderItem } from '@/utilities/orderExport'


interface ExportOrderButtonProps {
  order: OrderData
  items: OrderItem[]
  displayAuthor: string | null
}

export default function ExportOrderButton({ order, items, displayAuthor }: ExportOrderButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCSV = () => {
    downloadCSV(order, items)
    setShowMenu(false)
  }

  const handlePDF = () => {
    setIsExporting(true)
    downloadPDF(order, items, displayAuthor)
    setShowMenu(false)
    setTimeout(() => setIsExporting(false), 1000)
  }

  return (
    <div className="order-edit-export-wrapper" ref={menuRef}>
      <button
        className="order-edit-btn-export-main"
        onClick={() => setShowMenu(!showMenu)}
      >
        <Download size={16} />
        Exporter
        <ChevronDown size={14} className={`export-chevron ${showMenu ? 'open' : ''}`} />
      </button>

      {showMenu && (
        <div className="order-edit-export-menu">
          <button className="order-edit-export-option" onClick={handleCSV}>
            <Download size={16} />
            <div>
              <span className="export-option-title">CSV</span>
              <span className="export-option-desc">Fichier tableur (.csv)</span>
            </div>
          </button>
          <button 
            className="order-edit-export-option" 
            onClick={handlePDF}
            disabled={isExporting}
          >
            <FileText size={16} />
            <div>
              <span className="export-option-title">PDF</span>
              <span className="export-option-desc">Document imprimable (.pdf)</span>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}