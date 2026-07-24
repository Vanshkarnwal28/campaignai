import re

def main():
    with open('frontend/src/services/api.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace BASE_URL
    content = content.replace("const BASE_URL = 'http://localhost:3001/api';", "const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';")

    # 2. Remove mockStore
    content = re.sub(r'// Client-side Mock Data Store.*?export const api = \{', 'export const api = {', content, flags=re.DOTALL)

    # 3. Strip try/catch blocks that fetch from backend
    def strip_try_catch(text):
        out = []
        i = 0
        while i < len(text):
            idx = text.find('try {', i)
            if idx == -1:
                out.append(text[i:])
                break
            out.append(text[i:idx])
            i = idx + 5
            
            # Find matching '}' for 'try {'
            brace_count = 1
            try_body = []
            while brace_count > 0 and i < len(text):
                if text[i] == '{':
                    brace_count += 1
                elif text[i] == '}':
                    brace_count -= 1
                if brace_count > 0:
                    try_body.append(text[i])
                i += 1
                
            try_body_str = ''.join(try_body).strip()
            
            # Check for 'catch'
            catch_idx = text.find('catch', i)
            if catch_idx != -1 and text[i:catch_idx].strip() == '':
                # Find matching '}' for 'catch {'
                brace_idx = text.find('{', catch_idx)
                i = brace_idx + 1
                brace_count = 1
                while brace_count > 0 and i < len(text):
                    if text[i] == '{':
                        brace_count += 1
                    elif text[i] == '}':
                        brace_count -= 1
                    i += 1
                
                # Use try_body_str and preserve its indentation, remove 'try {' indent
                # We can just output the try_body_str
                out.append(try_body_str)
            else:
                out.append('try {')
                out.append(''.join(try_body))
                out.append('}')
        return ''.join(out)

    content = strip_try_catch(content)

    with open('frontend/src/services/api.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    main()
