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
              "text": `Here's a refined version of your AI prompt tailored to generate an array in the desired format:


**Prompt**:

You are provided with a JSON object representing elements on a webpage. Your task is to analyze the structure and identify interactive elements that would benefit from tagging.

- **Output Requirements**:
  - Return a JSON array containing objects for each identified interactive element.
  - Each object in the array should include:
    - **"element"**: The specific name or identifier of the element (e.g., "Button - Log in," "Link - Sign Up," "Form - Contact Us"), with a capitalized first letter and clear description of the action or label if available.
    - **"reason"**: A detailed explanation of why the element should be tagged (e.g., "Enables user engagement tracking for key call-to-action" or "Records submission data for lead generation").
    - **"selector_code"**: The query selector string (QSS) for the element.

- **Objective**:
  - Focus on user-interactive elements, such as buttons, links, form fields, and other clickable areas.
  - Exclude non-interactive elements unless they contain critical metadata or content useful for tracking.
  - Rank the elements in order of importance, listing the most significant elements first.

- **Classification**:
  - At the end of the output, add a classification for each element type:
    - For a button, mark as **Track Button**.
    - For a form, mark as **Track Form**.

- **Example Format**:
  json
  [
    {"element": "Button - Log In", "reason": "Tracks key user engagement on login action", "selector_code": "selector"},
    {"element": "Form - Contact Us", "reason": "Captures user input for contact and follow-up", "selector_code": "selector"}
  ]
  

**Input**:
  ${parsedInput}

**Constraints**:
- Follow the specified output structure without deviation.
- Ensure each element in the array has a unique purpose and offers a clear tagging rationale.
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
