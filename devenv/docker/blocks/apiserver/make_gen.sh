#!/usr/bin/env bash

set -euxo pipefail

pushd /tmp
go install github.com/cloudflare/cfssl/cmd/...@latest
popd
rm -rf certs

mkdir -p certs/webhooks certs/authn certs/authz

cfssl genkey -initca ca.json | cfssljson -bare ca
mv ca*.pem certs/

cfssl gencert -ca certs/ca.pem -ca-key certs/ca-key.pem webhooks.json | cfssljson -bare webhooks
mv webhooks*.pem certs/webhooks/

cfssl gencert -ca certs/ca.pem -ca-key certs/ca-key.pem -profile=client authn-webhook-user.json | cfssljson -bare authn-webhook-user
mv authn-webhook-user*.pem authn/

cfssl gencert -ca certs/ca.pem -ca-key certs/ca-key.pem -profile=client authz-webhook-user.json | cfssljson -bare authz-webhook-user
mv authz-webhook-user*.pem authz/

rm -rf *.csr

echo 'PUT THIS IN VALIDATING WEBHOOK CONFIGURATION'
echo 'clientConfig'
echo '  caBundle: {BASE64}'
echo 'writing base64 encoded cert to webhooks/base_64_cert.pem'
cat certs/ca.pem | base64 >> certs/webhooks/base_64_cert.pem
