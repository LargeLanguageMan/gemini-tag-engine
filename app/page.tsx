'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tag } from "lucide-react"

interface Recommendation {
  element: string;
  reason: string;
}

declare const gtag: Function;

export default function WebsiteScraper() {
  const [url, setUrl] = useState('')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setRecommendations([])

    try {
      // First, fetch the HTML structure from the scraper
      const scraperResponse = await fetch('/api/html-converter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })
      gtag('event', 'input_url', {
        'input_text': url,
      });
      if (!scraperResponse.ok) {
        throw new Error('Failed to scrape website')
      }
      
      const data = await scraperResponse.json()
      console.log('Full scraper response:', data)
    
      
      // Then, get recommendations using Gemini
      const geminiResponse = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          input: data 
        }),
      })

      if (!geminiResponse.ok) {
        throw new Error(`Failed to analyse HTML: ${geminiResponse.statusText}`)
      }

      const response = await geminiResponse.json()
      
      // Extract the JSON string from the text property and parse it
      let recommendationsArray = []
      if (response.text) {
        // Clean up the JSON string first
        let jsonString = response.text
          .replace(/```json\n/, '')  // Remove opening ```json
          .replace(/\n```$/, '')     // Remove closing ```
          .trim()                    // Remove extra whitespace
        
        // Find the last complete object (ending with "}") and add closing bracket
        const lastBraceIndex = jsonString.lastIndexOf('}')
        if (lastBraceIndex !== -1) {
          jsonString = jsonString.substring(0, lastBraceIndex + 1) + ']'
        }
        
        // Remove trailing comma if present
        jsonString = jsonString.replace(/,(\s*[\]}])/g, '$1')
        
        try {
          console.log('Cleaned JSON string:', jsonString)
          recommendationsArray = JSON.parse(jsonString)
          console.log('Parsed recommendations:', recommendationsArray)
        } catch (e) {
          console.error('Failed to parse recommendations JSON:', e)
        }
      }

      // Format and validate each recommendation
      const formattedRecs = recommendationsArray.map((rec: { element?: string; reason?: string }) => ({
        element: typeof rec?.element === 'string' ? rec.element : 'Unknown Element',
        reason: typeof rec?.reason === 'string' ? rec.reason : 'No reason provided'
      }))

      console.log('Formatted recommendations:', formattedRecs)
      setRecommendations(formattedRecs)
    } catch (error) {
      console.error('Error:', error)
      setRecommendations([])
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="w-full bg-[#2D2D2D] text-white p-3 rounded-t-lg mb-8 font-mono flex items-center">
        <span className="text-gray-300">$</span>
        <span className="text-gray-300 ml-2">&gt;</span>
        <span className="text-gray-300 ml-2">made by wes</span>
        <span className={`ml-2 ${showCursor ? 'opacity-100' : 'opacity-0'} text-[#00FF00] transition-opacity duration-100`}>▋</span>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-600 inline-block text-transparent bg-clip-text">
          AI Tagging Insights for Websites
        </h1>
        <p className="text-lg text-gray-600">
          Smart recommendations at your fingertips{' '}
          <span className="text-blue-600 hover:underline transition-all duration-300">
            Powered by Gemini
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            type="url"
            placeholder="Enter website URL. Include https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="flex-grow"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Scraping...' : 'Scrape Website'}
          </Button>
        </div>
      </form>

      {/* Add debug element */}
      <div className="mb-4">
        <p>Number of recommendations: {recommendations.length}</p>
      </div>

      {Array.isArray(recommendations) && recommendations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {recommendations.map((rec, index) => {
        return (
          <Card key={index} className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                <span className="break-words">{rec.element}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="break-words">{rec.reason}</p>
            </CardContent>
          </Card>
        );
      })}
        </div>
      ) : (
        <p className="text-gray-500">No recommendations available</p>
      )}
    </div>
  )
}