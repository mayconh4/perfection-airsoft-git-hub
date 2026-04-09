import os
import requests
import json

TOKEN = "sbp_03d22afdf4304bbbe8a439f2ed15c34ccef36d34"
PROJECT_REF = "seewdqetyolfmqsiyban"
FUNCTIONS = ["asaas-payment", "asaas-webhook", "cep-lookup"]

def deploy_function(func_name):
    file_path = f"supabase/functions/{func_name}/index.ts"
    if not os.path.exists(file_path):
        print(f"Skipping {func_name}: file not found")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        code = f.read()

    # De acordo com a API v1 do Supabase, os campos devem ser planos ou em partes separadas
    # Tentamos passar como campos individuais no form-data
    
    url_put = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/functions/{func_name}"
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    # Multipart parameters
    files = {
        "file": ("index.ts", code, "application/typescript")
    }
    data = {
        "name": func_name,
        "slug": func_name,
        "verify_jwt": "false" # Algumas APIs preferem string para boolean em form-data
    }

    print(f"\n>>> Fazendo deploy de {func_name} (PUT)...")
    resp = requests.put(url_put, headers=headers, files=files, data=data)
    
    if resp.status_code == 404:
        print(f"Function {func_name} not found. Creating with POST...")
        url_post = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/functions"
        resp = requests.post(url_post, headers=headers, files=files, data=data)

    if resp.status_code in [200, 201]:
        print(f"SUCCESS: {func_name} deployed! (Status {resp.status_code})")
    else:
        print(f"FAILURE: {func_name} failed with status {resp.status_code}: {resp.text}")

if __name__ == "__main__":
    for func in FUNCTIONS:
        deploy_function(func)
