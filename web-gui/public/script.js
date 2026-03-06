document.addEventListener('DOMContentLoaded', () => {
    const testCommandBtn = document.getElementById('testCommandBtn');
    const statusResultDiv = document.getElementById('statusResult');

    testCommandBtn.addEventListener('click', async () => {
        statusResultDiv.innerHTML = '<p>Fetching status...</p>';
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            statusResultDiv.innerHTML = `
                <h3>AgentFlowboard Status:</h3>
                <p><strong>Message:</strong> ${data.message}</p>
                <p><strong>Data:</strong> ${data.data}</p>
                <p><strong>Timestamp:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
            `;
        } catch (error) {
            statusResultDiv.innerHTML = `<p style="color: red;">Error fetching status: ${error.message}</p>`;
            console.error('Error fetching status:', error);
        }
    });
});
