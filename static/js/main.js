document.addEventListener('DOMContentLoaded', function() {
    const addressesTextarea = document.getElementById('addresses');
    const callApiButton = document.getElementById('callApi');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');

    function isValidAddress(address) {
        return address.endsWith('.eth') || /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    function showLoading(show) {
        loadingDiv.classList.toggle('d-none', !show);
        callApiButton.disabled = show;
        if (show) {
            resultsDiv.innerHTML = '';
            callApiButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
        } else {
            callApiButton.innerHTML = '<i class="fas fa-search me-2"></i>Check Points';
        }
    }

    function formatNumber(number) {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(number);
    }

    function createBoostBadge(label, value) {
        return `
            <div class="boost-badge d-inline-block me-2 mb-2">
                <i class="fas fa-rocket me-1"></i>${label}: ${value}%
            </div>
        `;
    }

    function formatPointsData(data) {
        return `
            <div class="result-card shadow-sm">
                <div class="row g-4">
                    <!-- Total Points Section -->
                    <div class="col-md-6">
                        <div class="stats-card">
                            <h4 class="h5 mb-3"><i class="fas fa-star-half-alt me-2"></i>Total Points</h4>
                            <div class="points-value">${formatNumber(data.totalPoints)}</div>
                            <small class="text-muted">Daily: ${formatNumber(data.dailyPoints)}</small>
                        </div>
                    </div>

                    <!-- Boosts Section -->
                    <div class="col-md-6">
                        <div class="stats-card">
                            <h4 class="h5 mb-3"><i class="fas fa-rocket me-2"></i>Active Boosts</h4>
                            <div class="boosts-container">
                                ${createBoostBadge(data.boosts.epoch.name, data.boosts.epoch.value)}
                                ${createBoostBadge('Referee Welcome', data.boosts.refereeWelcomeBoost)}
                                ${createBoostBadge('Dinero Power', data.boosts.dineroPowerUser)}
                                ${createBoostBadge('Hyperliquid', data.boosts.hyperliquidPowerUser)}
                                ${createBoostBadge(`Resolv (${data.boosts.resolvPowerUser.level})`, data.boosts.resolvPowerUser.value)}
                            </div>
                        </div>
                    </div>

                    <!-- Activities Section -->
                    <div class="col-12">
                        <div class="stats-card">
                            <h4 class="h5 mb-3"><i class="fas fa-chart-line me-2"></i>Daily Activities</h4>
                            <div class="row g-3">
                                ${Object.entries(data.dailyActivities)
                                    .filter(([_, value]) => value > 0)
                                    .map(([key, value]) => `
                                        <div class="col-md-6 col-lg-4">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <span>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                                                <strong>${formatNumber(value)}</strong>
                                            </div>
                                        </div>
                                    `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function showError(message, details = null) {
        return `
            <div class="error-message">
                <div class="d-flex align-items-center">
                    <i class="fas fa-exclamation-circle fa-lg me-3"></i>
                    <div>
                        <strong>Error:</strong> ${message}
                        ${details ? `<div class="mt-2 small">${details}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    async function fetchAddressPoints(address) {
        try {
            const response = await fetch(`/api/points/${encodeURIComponent(address)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error fetching data:', error);
            return { 
                success: false, 
                error: error.message || 'Failed to fetch data'
            };
        }
    }

    callApiButton.addEventListener('click', async () => {
        const addresses = addressesTextarea.value
            .split(/[\n,]+/)
            .map(addr => addr.trim())
            .filter(addr => addr !== "");

        if (addresses.length === 0) {
            resultsDiv.innerHTML = showError('Please enter at least one address');
            return;
        }

        const invalidAddresses = addresses.filter(addr => !isValidAddress(addr));
        if (invalidAddresses.length > 0) {
            resultsDiv.innerHTML = showError('Invalid addresses:', invalidAddresses.join(', '));
            return;
        }

        showLoading(true);

        try {
            for (const address of addresses) {
                const result = await fetchAddressPoints(address);
                const addressCard = document.createElement('div');
                addressCard.className = 'result mb-4';

                if (result.success) {
                    addressCard.innerHTML = `
                        <div class="card border-0 shadow">
                            <div class="card-header bg-primary bg-gradient d-flex align-items-center p-3">
                                <i class="fas fa-wallet fa-lg me-2"></i>
                                <h3 class="h5 mb-0">${address}</h3>
                            </div>
                            <div class="card-body p-4">
                                ${formatPointsData(result.data)}
                            </div>
                        </div>
                    `;
                } else {
                    addressCard.innerHTML = `
                        <div class="card border-danger border-0 shadow">
                            <div class="card-header bg-danger bg-gradient d-flex align-items-center p-3">
                                <i class="fas fa-exclamation-circle fa-lg me-2"></i>
                                <h3 class="h5 mb-0">${address}</h3>
                            </div>
                            <div class="card-body p-4">
                                ${showError(result.error)}
                            </div>
                        </div>
                    `;
                }

                resultsDiv.appendChild(addressCard);
            }
        } catch (error) {
            resultsDiv.innerHTML = showError('An unexpected error occurred', error.message);
        } finally {
            showLoading(false);
        }
    });
});