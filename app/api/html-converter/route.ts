import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import axios from 'axios'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      },
      timeout: 5000, // 5 second timeout
    })
    const html = response.data
    const $ = cheerio.load(html)
    const interactiveElements: InteractiveElement[] = []
    interface InteractiveElement {
        type: 'button' | 'input' | 'select' | 'form' | 'link';
        element: string;
        text?: string;
        attributes: Record<string, string>;
        placeholder?: string;
        inputType?: string;
        options?: string[];
        action?: string;
        method?: string;
        href?: string;
      }


    $('button, input[type="button"], input[type="submit"]').each((_, element) => {
      interactiveElements.push({
        type: 'button',
        element: element.name,
        text: $(element).text().trim() || ($(element).val() as string) || 'Unnamed Button',
        attributes: element.attribs
      })
    })


    $('input[type="text"], input[type="search"], input[type="email"], input[type="password"]').each((_, element) => {
      interactiveElements.push({
        type: 'input',
        element: element.name,
        placeholder: element.attribs.placeholder || 'No placeholder',
        inputType: element.attribs.type,
        attributes: element.attribs
      })
    })


    $('select').each((_, element) => {
      const options = $(element).find('option').map((_, option) => $(option).text()).get()
      interactiveElements.push({
        type: 'select',
        element: element.name,
        options: options,
        attributes: element.attribs
      })
    })


    $('form').each((_, element) => {
      interactiveElements.push({
        type: 'form',
        element: element.name,
        action: element.attribs.action || 'No action specified',
        method: element.attribs.method || 'get',
        attributes: element.attribs
      })
    })

  
    $('a').each((_, element) => {
      interactiveElements.push({
        type: 'link',
        element: element.name,
        text: $(element).text().trim() || 'Unnamed Link',
        href: element.attribs.href || '#',
        attributes: element.attribs
      })
    })

    return NextResponse.json({
      success: true,
      elements: interactiveElements
    })

  } catch (error: any) {
    console.error('Error analyzing page:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to analyze page',
        details: error.message || 'Unknown error',
        status: error.response?.status
      },
      { status: error.response?.status || 500 }
    )
  }
}