'use client'

import { useEffect, useRef, useState } from 'react'

interface PlaceSuggestion {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

interface AddressComponents {
  address: string
  suburb: string
  postcode: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (components: AddressComponents) => void
  placeholder?: string
  className?: string
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, className }: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<NodeJS.Timeout>()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const sessionTokenRef = useRef<string>(crypto.randomUUID())

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchSuggestions(input: string) {
    if (input.length < 3) { setSuggestions([]); setShowDropdown(false); return }
    setLoading(true)
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:au&types=address&language=en&key=${apiKey}&sessiontoken=${sessionTokenRef.current}`
      
      // Use our proxy API route to avoid CORS
      const res = await fetch(`/api/places?input=${encodeURIComponent(input)}&sessiontoken=${sessionTokenRef.current}`)
      const data = await res.json()
      
      if (data.predictions) {
        const filtered = data.predictions
          .filter((p: any) => p.description.includes('VIC') || p.description.includes('Victoria'))
          .slice(0, 5)
          .map((p: any) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || '',
          }))
        setSuggestions(filtered.length > 0 ? filtered : data.predictions.slice(0, 5).map((p: any) => ({
          placeId: p.place_id,
          description: p.description,
          mainText: p.structured_formatting?.main_text || p.description,
          secondaryText: p.structured_formatting?.secondary_text || '',
        })))
        setShowDropdown(true)
      }
    } catch (e) {
      console.error('Places API error:', e)
    }
    setLoading(false)
  }

  async function handleSelect(suggestion: PlaceSuggestion) {
    setShowDropdown(false)
    onChange(suggestion.mainText)
    setActiveIndex(-1)

    // Fetch place details to get suburb + postcode
    try {
      const res = await fetch(`/api/places/details?placeId=${suggestion.placeId}&sessiontoken=${sessionTokenRef.current}`)
      const data = await res.json()
      
      if (data.result?.address_components) {
        const components = data.result.address_components
        const streetNumber = components.find((c: any) => c.types.includes('street_number'))?.long_name || ''
        const streetName = components.find((c: any) => c.types.includes('route'))?.long_name || ''
        const suburb = components.find((c: any) => c.types.includes('locality'))?.long_name || ''
        const postcode = components.find((c: any) => c.types.includes('postal_code'))?.long_name || ''
        
        const fullAddress = streetNumber ? `${streetNumber} ${streetName}` : streetName || suggestion.mainText
        
        onSelect({
          address: fullAddress,
          suburb,
          postcode,
        })
        // Refresh session token after selection
        sessionTokenRef.current = crypto.randomUUID()
      }
    } catch (e) {
      // Fallback: just use what we have
      onSelect({ address: suggestion.mainText, suburb: '', postcode: '' })
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)) }
    if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); handleSelect(suggestions[activeIndex]) }
    if (e.key === 'Escape') { setShowDropdown(false); setActiveIndex(-1) }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => fetchSuggestions(e.target.value), 300)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder || 'Start typing an address...'}
          autoComplete="off"
          className={className}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#E8001D] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={s.placeId}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                i === activeIndex ? 'bg-red-50' : ''
              }`}
            >
              <span className="text-gray-400 mt-0.5 flex-shrink-0 text-base">📍</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{s.mainText}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{s.secondaryText}</p>
              </div>
            </button>
          ))}
          <div className="px-4 py-2 bg-gray-50 flex items-center justify-end gap-1">
            <span className="text-xs text-gray-400">Powered by</span>
            <span className="text-xs font-semibold text-gray-500">Google</span>
          </div>
        </div>
      )}
    </div>
  )
}
