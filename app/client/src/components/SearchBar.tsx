import React, { useState } from 'react';

interface SearchableItem {
    id: number;
    name: string; // Changed from wrapper 'String' to primitive 'string'
}

const mockData: SearchableItem[] = [
    { id: 1, name: 'TypeScript' },
    { id: 2, name: 'JavaScript' },
    { id: 3, name: 'React' }
];

export const SearchBar: React.FC = () => {
    const [query, setQuery] = useState<string>('');

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => 
        setQuery(event.target.value); // Fixed arrow function syntax

    const filteredItems = mockData.filter((item) => 
        item.name.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div style={{ padding: '20px' }}>
            <input
                type="text"
                placeholder="Type to search ..."
                value={query}
                onChange={handleInputChange}
                style={{ padding: '8px', width: '250px', marginBottom: '10px', display: 'block' }}
            />
            <ul>
                {filteredItems.map((item) => (
                    <li key={item.id}>{item.name}</li>
                ))}
            </ul>
        </div>
    );
};