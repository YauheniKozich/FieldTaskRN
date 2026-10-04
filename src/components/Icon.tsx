import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ColorValue } from 'react-native';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 18, color, ...props }: {
  name: IconName;
  size?: number;
  color: ColorValue;
}) {
  return <Ionicons name={name} size={size} color={color} {...props} />;
}
