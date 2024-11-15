'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tag, Linkedin, ChevronDown, ChevronUp } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface Recommendation {
  element: string;
  reason: string;
  selector_code?: string;
}

declare const gtag: Function;

const ExpandableCard = ({ rec, index }: { rec: Recommendation, index: number }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Card 
        key={index} 
        className="group hover:scale-[1.02] transition-all duration-200 shadow-md hover:shadow-xl bg-gradient-to-br from-white to-gray-50 border border-gray-100 cursor-pointer"
        onClick={() => setIsDialogOpen(true)}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600/10 to-blue-600/10">
              <Tag className="h-5 w-5 text-purple-600" />
            </div>
            <span className="break-words font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {rec.element}
              
            </span>
          </CardTitle>
          <span className="text-sm text-gray-500">Click to get CSS</span>
        </CardHeader>
        <CardContent>
          <p className="break-words text-gray-600 leading-relaxed">
            {rec.reason}
          </p>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Query Selector
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Use this CSS selector to target the element on your page.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <code className="text-sm text-gray-800 break-all font-mono">
              {rec.selector_code || 'No selector available'}
            </code>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            Hint: Use $$('{rec.selector_code}') to test the query selector in the console.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function WebsiteScraper() {
  const [url, setUrl] = useState('')
  const [useFlash, setUseFlash] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCursor, setShowCursor] = useState(true)
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    gtag('event', 'model_preference', {
      'model_type': useFlash ? 'flash' : 'pro',
      'initial_selection': true
    });
  }, []);

  const handleModelToggle = (checked: boolean) => {
    setUseFlash(checked);
    gtag('event', 'model_preference', {
      'model_type': checked ? 'flash' : 'pro',
      'user_toggled': true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Trim whitespace from URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`
    }
    console.log('Normalized URL:', normalizedUrl)
    setIsLoading(true)
    setRecommendations([])

    try {
      // First, fetch the HTML structure from the scraper
      const scraperResponse = await fetch('/api/html-converter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizedUrl }),
      })
      gtag('event', 'input_url', {
        'input_text_url': normalizedUrl,
      });
      if (!scraperResponse.ok) {
        throw new Error('Failed to load website. Please check the URL and try again.')
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
          input: data,
          useFlash: useFlash 
        }),
      })

      if (!geminiResponse.ok) {
        throw new Error(`Failed to analyse HTML: ${geminiResponse.statusText}`)
      }

      const response = await geminiResponse.json()
      
      // Extract the JSON string from the text property and parse it
      let recommendationsArray = []
      if (response.text) {
        // clean json
        let jsonString = response.text
          .replace(/```json\n/, '') 
          .replace(/\n```$/, '')     
          .trim()                    
        
        // Find the last complete object (ending with "}") and add closing bracket
        const lastBraceIndex = jsonString.lastIndexOf('}')
        if (lastBraceIndex !== -1) {
          jsonString = jsonString.substring(0, lastBraceIndex + 1) + ']'
        }
        
        // Remove trailing comma if present
        jsonString = jsonString.replace(/,(\s*[\]}])/g, '$1')
        
        try {
          
          recommendationsArray = JSON.parse(jsonString)
        } catch (e) {
          console.error('Failed to parse recommendations JSON:', e)
        }
      }

      // Format and validate each recommendation
      const formattedRecs = recommendationsArray.map((rec: { element?: string; reason?: string; selector_code?: string }) => ({
        element: typeof rec?.element === 'string' ? rec.element : 'Unknown Element',
        reason: typeof rec?.reason === 'string' ? rec.reason : 'No reason provided',
        selector_code: typeof rec?.selector_code === 'string' ? rec.selector_code : undefined
      }))

      //console.log('Formatted recommendations:', formattedRecs)
      setRecommendations(formattedRecs)
    } catch (error) {
      console.error('Error:', error)
      setError((error as Error).message)
      setRecommendations([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="w-full bg-[#2D2D2D] text-white p-3 rounded-t-lg mb-8 font-mono flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-gray-300">$</span>
          <span className="text-gray-300 ml-2">&gt;</span>
          <span className="text-gray-300 ml-2">made by wes</span>
          <span className={`ml-2 ${showCursor ? 'opacity-100' : 'opacity-0'} text-[#00FF00] transition-opacity duration-100`}>▋</span>
        </div>
        <a 
          href="https://www.linkedin.com/in/wesley-hucker/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-300 hover:text-white transition-colors duration-200"
        >
          <Linkedin className="w-5 h-5" />
        </a>
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              type="text"
              placeholder="Enter website URL (like, aiprojectlabs.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="flex-grow"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate Insights'}
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="model-toggle"
              checked={useFlash}
              onCheckedChange={handleModelToggle}
            />
            <Label 
              htmlFor="model-toggle" 
              className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
            >
              {useFlash ? 'Using Fast Mode (Gemini Flash)' : 'Using Detailed Mode (Gemini Pro)'}
            </Label>
          </div>
        </div>
      </form>

      {/* Update the debug element styling */}
      <div className="mb-4">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-600/20">
          <span className="text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Number of recommendations: {recommendations.length}
          </span>
        </div>
      </div>

      {error ? (
        <div className="text-center p-8 rounded-lg border border-red-200 bg-red-50">
          <p className="text-red-600 font-medium mb-2">Error</p>
          <p className="text-gray-600">{error}</p>
        </div>
      ) : Array.isArray(recommendations) && recommendations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((rec, index) => (
            <ExpandableCard key={index} rec={rec} index={index} />
          ))}
        </div>
      ) : null}

      {/* Add this footer section */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <a 
          href="https://www.linkedin.com/in/wesley-hucker/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-blue-600 transition-colors duration-200"
        >
          Connect with me on LinkedIn
        </a>
      </div>
    </div>
  )
}