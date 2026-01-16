import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

/**
 * Input de data com máscara DD/MM/YYYY
 */
export default function DateInput({ value, onChangeText, placeholder, style, ...props }) {
  const formatDate = (text) => {
    // Remove tudo que não é número
    const numbers = text.replace(/\D/g, '');
    
    // Aplica a máscara DD/MM/YYYY
    let formatted = numbers;
    
    if (numbers.length >= 2) {
      formatted = numbers.slice(0, 2);
      if (numbers.length >= 3) {
        formatted += '/' + numbers.slice(2, 4);
        if (numbers.length >= 5) {
          formatted += '/' + numbers.slice(4, 8);
        }
      }
    }
    
    return formatted;
  };

  const handleChangeText = (text) => {
    const formatted = formatDate(text);
    onChangeText(formatted);
  };

  return (
    <TextInput
      {...props}
      style={[styles.input, style]}
      value={value}
      onChangeText={handleChangeText}
      placeholder={placeholder || 'DD/MM/AAAA'}
      keyboardType="numeric"
      maxLength={10}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
});