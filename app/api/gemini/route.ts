// app/api/gemini/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    // Validate the request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Check if input exists
    if (!body.input) {
      return NextResponse.json(
        { error: 'Missing required field: input' },
        { status: 400 }
      );
    }

    const { input } = body;

    // Ensure input is a valid JSON string
    let parsedInput;
    try {
      // If input is already an object, stringify it first
      parsedInput = typeof input === 'string' ? input : JSON.stringify(input);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON format in input field' },
        { status: 400 }
      );
    }

    // Initialise GoogleGenerativeAI with the secret API key
    
    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'failed');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              "text": `You are provided with a JSON object representing elements on a webpage. Your task is to analyze the structure and identify interactive elements that could benefit from tagging. 
            
              - **Output Requirements**:
                - Return a JSON array containing objects for each interactive element identified.
                - Each object should include:
                  - **"element"**: The element name or identifier (e.g., "button", "link", etc.), use capitilised first letter, and also be more specific for the title so if its a button it is Button - Log in/Log Out, etc
                  - **"reason"**: A brief explanation of why the element should be tagged (e.g., "User engagement tracking", "Click-through measurement"). you need to give more details in this one, and be more specific.
            
              - **Objective**:
                - Focus on elements that users can interact with, such as buttons, links, form fields, and interactive sections.
                - Avoid non-interactive elements unless they contain important metadata or content relevant for tracking.
                - please make sure to rank the elements and list them from top to bottom in order of priority, the most important ones first.

              - ** classificaiton **:
               - at the bottom of the output add a classifcication of what tag it would fall under, for example if its a button it should be Track Button in bold
               if its a form it should be Track Form in bold.  
            
              - **Example Format**:
                \`[{"element": "button", "reason": "Tracks user engagement"}, {"element": "form", "reason": "Captures user input"}]\`
            
              **Input**: 
                ${parsedInput}
            
              **Constraints**:
              - Do not deviate from the specified output structure.
              - Ensure that each element in the array is unique and provides a clear purpose for tagging.
              `
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 1,
      },
    });

    // Retrieve the generated text from the result
    const text = await result.response.text();

    // Return the generated text as a JSON response
    return NextResponse.json({ text });
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json({ error: 'Error generating content' }, { status: 500 });
  }
}
