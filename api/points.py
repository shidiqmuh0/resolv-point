from flask import Flask, render_template, jsonify
from flask_cors import CORS
import logging
import requests
from web3 import Web3
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
logging.basicConfig(level=logging.DEBUG)

# Initialize Web3 with public Ethereum RPC
w3 = Web3(Web3.HTTPProvider('https://ethereum.publicnode.com'))

def resolve_ens(name):
    """Resolve ENS name to EVM address."""
    app.logger.info(f'Resolving ENS name: {name}')
    try:
        if name.endswith('.eth'):
            address = w3.ens.address(name)
            if address is None:
                raise ValueError(f'ENS name {name} not found')
            return address
        return name  # Return as-is if it's not an ENS name
    except Exception as e:
        app.logger.error(f'Error resolving ENS name {name}: {str(e)}')
        raise ValueError(f'Failed to resolve ENS name {name}: {str(e)}')

@app.route('/')
def index():
    app.logger.info('Rendering index page')
    return render_template('index.html')

@app.route('/api/points/<address>')
def get_points(address):
    app.logger.info(f'Processing address or ENS: {address}')
    try:
        # Try to resolve ENS name if provided
        try:
            resolved_address = resolve_ens(address)
            app.logger.info(f'Resolved address: {resolved_address}')
        except ValueError as e:
            return jsonify({
                'error': 'Invalid ENS name',
                'details': str(e)
            }), 400

        # Call Resolv.im API with resolved address
        response = requests.get(
            f'https://api.resolv.im/points',
            params={'address': resolved_address, 'mock': 'false'},
            headers={'Accept': 'application/json'}
        )

        app.logger.debug(f'API Response status: {response.status_code}')
        app.logger.debug(f'API Response content: {response.text}')

        response.raise_for_status()
        return jsonify(response.json())
    except requests.RequestException as e:
        app.logger.error(f'Error fetching points: {str(e)}')
        return jsonify({
            'error': 'Failed to fetch data from Resolv.im',
            'details': str(e)
        }), 500
    except Exception as e:
        app.logger.error(f'Unexpected error: {str(e)}')
        return jsonify({
            'error': 'An unexpected error occurred',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)